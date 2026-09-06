import html2canvas from "html2canvas";
import { gsap } from "gsap";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { AnimationConfig } from "@/types/editor";
import { ANIMATION_PRESET_MAP } from "@/lib/animations";

/**
 * Rasterizes the given DOM node (the canvas export root) to a PNG and
 * triggers a browser download. The export root is normally shown at a
 * reduced on-screen scale (to fit the viewport) via an inline CSS
 * `transform`; we temporarily neutralize that so the exported PNG always
 * matches the canvas's true pixel dimensions, then restore it.
 */
export async function exportNodeAsPng(node: HTMLElement, fileName: string, pixelRatio = 2) {
  const originalTransform = node.style.transform;
  node.style.transform = "none";

  try {
    const canvas = await html2canvas(node, {
      backgroundColor: null,
      scale: pixelRatio,
      useCORS: true,
      logging: false,
      width: node.offsetWidth,
      height: node.offsetHeight,
    });

    const url = canvas.toDataURL("image/png");
    downloadUrl(url, fileName);
  } finally {
    node.style.transform = originalTransform;
  }
}

function downloadUrl(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Plays the entrance/attention animation on `animTarget` frame-by-frame
 * (via GSAP timeline seeking, not real-time playback) and rasterizes each
 * frame with html2canvas — so capture is deterministic and doesn't depend
 * on how fast the browser can render.
 */
async function captureAnimationFrames(
  root: HTMLElement,
  animTarget: HTMLElement,
  animation: AnimationConfig,
  pixelRatio: number,
  maxFrames = 60
): Promise<{ frames: HTMLCanvasElement[]; fps: number }> {
  const preset = animation.preset ? ANIMATION_PRESET_MAP[animation.preset] : null;
  const totalTime = Math.max(0.1, animation.delay + animation.duration);
  const idealFps = 24;
  const frameCount = Math.min(maxFrames, Math.max(6, Math.round(totalTime * idealFps)));
  const fps = frameCount / totalTime;

  const originalTransform = root.style.transform;
  root.style.transform = "none";

  const tl = gsap.timeline({ paused: true });
  if (preset) {
    tl.set(animTarget, preset.from);
    tl.to(animTarget, {
      ...preset.to,
      duration: animation.duration,
      delay: animation.delay,
      ease: preset.ease ?? "power2.out",
    });
  }

  const frames: HTMLCanvasElement[] = [];
  try {
    for (let i = 0; i < frameCount; i++) {
      const t = frameCount === 1 ? totalTime : (i / (frameCount - 1)) * totalTime;
      if (preset) tl.time(t, true);
      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(root, {
        backgroundColor: null,
        scale: pixelRatio,
        useCORS: true,
        logging: false,
        width: root.offsetWidth,
        height: root.offsetHeight,
      });
      frames.push(canvas);
    }
  } finally {
    tl.kill();
    gsap.set(animTarget, { clearProps: "all" });
    root.style.transform = originalTransform;
  }

  return { frames, fps };
}

/** Finds the DOM node GSAP animates inside the export root. */
export function findAnimTarget(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>("[data-pluma-asset-anim]");
}

export async function exportNodeAsGif(
  root: HTMLElement,
  fileName: string,
  animation: AnimationConfig,
  pixelRatio = 1
) {
  const animTarget = findAnimTarget(root);
  if (!animTarget) throw new Error("Nothing to animate yet — add an image first.");

  const { frames, fps } = await captureAnimationFrames(root, animTarget, animation, pixelRatio);
  const gif = GIFEncoder();
  const delayMs = Math.round(1000 / fps);

  for (const canvas of frames) {
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: delayMs });
  }
  gif.finish();

  const blob = new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
  downloadBlob(blob, fileName);
}

/** Picks the best video container/codec this browser can actually record. */
function pickVideoMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}

export async function exportNodeAsVideo(
  root: HTMLElement,
  fileName: string,
  animation: AnimationConfig,
  pixelRatio = 1
) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video export isn't supported in this browser.");
  }

  const animTarget = findAnimTarget(root);
  if (!animTarget) throw new Error("Nothing to animate yet — add an image first.");

  const { frames, fps } = await captureAnimationFrames(root, animTarget, animation, pixelRatio);
  const width = frames[0].width;
  const height = frames[0].height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a recording surface.");

  const stream = canvas.captureStream(0);
  // Chromium exposes a manual frame-advance API for canvas capture streams.
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const mimeType = pickVideoMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();
  const frameDelayMs = Math.max(16, Math.round(1000 / fps));

  for (const frame of frames) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(frame, 0, 0);
    track.requestFrame?.();
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, frameDelayMs));
  }
  await new Promise((r) => setTimeout(r, 250));
  recorder.stop();

  const blob = await finished;
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  downloadBlob(blob, fileName.replace(/\.\w+$/, `.${ext}`));
}
