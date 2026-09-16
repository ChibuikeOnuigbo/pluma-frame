/**
 * Chibuike video — deterministic WebM export via canvas.captureStream(0) +
 * MediaRecorder. Frames are painted by the SAME scene painter at exact
 * timestamps and pushed with requestFrame(), so output matches the preview
 * rather than depending on real-time capture speed. MP4/GIF deliberately
 * absent (see capability flags) — honesty beats a broken encoder.
 */
import type { ChibuikeDoc } from './chibuikeTypes';
import { chibuikePaintScene } from './chibuikeRender';
import { chibuikeReflowDoc } from './chibuikeDoc';

export async function chibuikeEncodeWebM(
  doc: ChibuikeDoc,
  duration: number,
  fps: number,
  targetH: number,
  onDone: (blob: Blob) => void,
): Promise<void> {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record WebM (MediaRecorder missing).');
  const scale = targetH / doc.height;
  const scene = chibuikeReflowDoc(doc, Math.round(doc.width * scale), Math.round(doc.height * scale), 'scale');
  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('No supported WebM codec found.');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })); });
  rec.start();
  const total = Math.max(1, Math.round(duration * fps));
  const frameMs = 1000 / fps;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    chibuikePaintScene(ctx, scene, { quality: 1, time: t });
    track.requestFrame?.();
    await new Promise(r => setTimeout(r, Math.max(4, frameMs / 4))); // recorder pacing; timing comes from requestFrame, not wall clock
  }
  // hold the final frame briefly so the last GOP lands
  await new Promise(r => setTimeout(r, 120));
  rec.stop();
  const blob = await done;
  track.stop();
  onDone(blob);
}
