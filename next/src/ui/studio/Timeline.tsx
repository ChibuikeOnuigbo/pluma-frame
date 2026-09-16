// Chibuike timeline — a light, canvas-drawn keyframe strip: ruler, tracks,
// animated clips, draggable playhead. Not an NLE; never will be.
import { useEffect, useRef } from 'react';
import { Icon } from '../Icon';
import { store, useChibuike } from '../../chibuike/chibuikeStore';

export function Timeline() {
  useChibuike();
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    const draw = () => {
      const r = cv.parentElement!.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) {
        cv.width = Math.round(r.width * dpr);
        cv.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height;
      ctx.fillStyle = '#141724';
      ctx.fillRect(0, 0, W, H);
      const dur = store.animDuration;
      const px = (t: number) => 56 + (t / dur) * (W - 72);
      const tracks = store.doc.objects.filter(o => o.anim && o.anim.preset !== 'none');
      // ruler
      ctx.fillStyle = '#a6adc2';
      ctx.font = '10px ui-monospace, monospace';
      const stepT = dur > 6 ? 1 : 0.5;
      for (let t = 0; t <= dur + 1e-6; t += stepT) {
        const x = px(t);
        ctx.fillRect(x, 14, 1, 6);
        ctx.fillText(`${t.toFixed(1)}s`, x + 3, 20);
        ctx.globalAlpha = 0.07;
        ctx.fillRect(x, 26, 1, H - 26);
        ctx.globalAlpha = 1;
      }
      // tracks
      let y = 30;
      for (const o of tracks) {
        const a = o.anim!;
        const selected = store.selection.includes(o.id);
        ctx.fillStyle = selected ? 'rgba(124,92,255,0.10)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(4, y - 3, W - 8, 22);
        // label
        ctx.fillStyle = selected ? '#cfc4ff' : '#8b93a7';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillText((o.name || o.kind).slice(0, 8), 8, y + 11);
        // clip bar
        const x0 = px(a.delay), x1 = px(Math.min(dur, a.delay + a.duration));
        ctx.fillStyle = selected ? '#7c5cff' : '#4a4f68';
        ctx.beginPath();
        ctx.roundRect(x0, y, Math.max(8, x1 - x0), 16, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '9.5px -apple-system, sans-serif';
        ctx.fillText(a.preset, x0 + 5, y + 11);
        y += 24;
        if (y > H - 12) break;
      }
      if (!tracks.length) {
        ctx.fillStyle = '#6b7288';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.fillText('No animations yet — select an object and open the Animate tab.', 12, H / 2);
      }
      // playhead
      const pxh = px(store.playhead);
      ctx.strokeStyle = '#ff5fd2';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pxh, 4); ctx.lineTo(pxh, H - 2); ctx.stroke();
      ctx.fillStyle = '#ff5fd2';
      ctx.beginPath(); ctx.moveTo(pxh - 5, 4); ctx.lineTo(pxh + 5, 4); ctx.lineTo(pxh, 12); ctx.closePath(); ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrub = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const t = ((e.clientX - r.left) - 56) / (r.width - 72) * store.animDuration;
    store.seek(t);
  };

  return (
    <div className="pf-timeline" data-tut="timeline">
      <div className="pf-tl-toolbar">
        <button className="pf-icon-btn" title="Play / pause" aria-label={store.playing ? 'Pause' : 'Play'} onClick={() => store.playing ? store.stop() : store.play()}>
          <Icon name={store.playing ? 'pause' : 'play'} size={14} />
        </button>
        <button className="pf-icon-btn" title="Stop" aria-label="Stop" onClick={() => store.stop()}>
          <Icon name="stopSquare" size={13} />
        </button>
        <span className="pf-tiny pf-muted" style={{ fontFamily: 'var(--pf-mono)' }}>{store.playhead.toFixed(2)}s / {store.animDuration.toFixed(1)}s</span>
        <div className="pf-sep" />
        <span className="pf-tiny pf-muted">Duration</span>
        <input type="range" min={1} max={10} step={0.5} value={store.animDuration} style={{ width: 90 }}
          onChange={e => { store.animDuration = parseFloat(e.target.value); store.bumpReact(); }} aria-label="Scene duration" />
        <div className="spacer" style={{ flex: 1 }} />
        <button className="pf-chip" onClick={() => { store.modalOpen = 'export'; (store as unknown as { exportAnim?: boolean }).exportAnim = true; store.bumpReact(); }}>Export WebM…</button>
      </div>
      <div className="pf-tl-body" onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrub(e); }}
        onPointerMove={e => { if (e.buttons === 1) scrub(e); }}>
        <canvas ref={cvRef} className="pf-tl-canvas" />
      </div>
    </div>
  );
}
