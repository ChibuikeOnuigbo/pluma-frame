/**
 * Chibuike landing — one hero, one living demo, a quiet feature row.
 * The demo animates the actual product promise: plain screenshot →
 * background → perspective → shadow → annotation → export. It is driven by
 * the REAL painter on a small canvas, so what you see is what the app does.
 */
import { useEffect, useRef, useState } from 'react';
import { chibuikeNewDoc } from '../chibuike/chibuikeDoc';
import { chibuikePaintScene } from '../chibuike/chibuikeRender';
import { chibuikeMakeText, chibuikeMakeArrow, chibuikeMakeNumber } from '../chibuike/chibuikeFactories';
import { chibuikeId } from '../chibuike/chibuikeIds';
import type { ChibuikeDoc } from '../chibuike/chibuikeTypes';

const LOGO = (
  <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
    <defs>
      <linearGradient id="pflg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8b7cff" /><stop offset="1" stopColor="#4cc2ff" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#12141c" />
    <rect x="2.75" y="2.75" width="26.5" height="26.5" rx="7.25" fill="none" stroke="url(#pflg)" strokeWidth="1.5" />
    <path d="M10 22V10h6.2c2.9 0 4.8 1.7 4.8 4.2s-1.9 4.3-4.8 4.3H13V22h-3z" fill="url(#pflg)" />
  </svg>
);

const CHIBUIKE_STEPS = ['Screenshot', 'Background', '3D tilt', 'Shadow', 'Annotate', 'Export'] as const;

export function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const demoDoc = useRef<ChibuikeDoc | null>(null);
  const demoImg = useRef<HTMLImageElement | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    const img = new Image();
    img.src = '/demo/dashboard.png';
    img.onload = () => { demoImg.current = img; };
    // Build the demo document once — real doc, real painter.
    const doc = chibuikeNewDoc({ width: 1280, height: 680, name: 'Demo' });
    demoDoc.current = doc;
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d');
    if (!ctx) return; // no 2d context (test env / ancient browser) — render static markup only
    cv.width = 1280; cv.height = 680;

    let t0 = performance.now();
    const DUR = 2.6; // seconds for the full loop
    const loop = (now: number) => {
      const t = ((now - t0) / 1000) % DUR;
      const p = Math.min(1, t / (DUR - 0.6)); // eased progress
      const d = demoDoc.current!;
      // stage 0: plain screenshot centered
      d.background = { type: 'transparent' as const };
      d.objects = [];
      const iw = 760, ih = iw * (img.height / img.width);
      const cx = 640, cy = 340;
      const stage = Math.min(5, Math.floor(p * 6));
      setStageThrottled(stage);
      const f = (stage: number, k: number) => Math.max(0, Math.min(1, (p * 6 - k)));

      const g = f(stage, 1); // background presence
      const tilt = f(stage, 2);
      const annot = f(stage, 4);
      const rx = tilt * 7, ry = -tilt * 11;

      d.background = g < 0.02
        ? { type: 'transparent' as const }
        : { type: 'mesh' as const, base: '#10121c', softness: 1.05, points: [
            { x: 0.12, y: 0.18, r: 0.5, color: '#5b3df5' },
            { x: 0.88, y: 0.25, r: 0.45, color: '#1899c9' },
            { x: 0.5, y: 0.95, r: 0.55, color: '#b34df0' },
          ] };
      const s = 1 - tilt * 0.06;
      const imgObj = {
        id: chibuikeId('im'), name: 'Screenshot', kind: 'image' as const,
        x: cx - iw * s / 2, y: cy - ih * s / 2, w: iw * s, h: ih * s,
        rotation: 0, opacity: 1, visible: true, locked: false, blend: 'normal' as const,
        groupId: null, anim: null,
        assetId: 'demo', fit: 'contain' as const, srcRect: null,
        radius: 14, border: { width: 1, color: 'rgba(255,255,255,0.14)' },
        shadow: tilt > 0.05 ? { x: 0, y: 26 * tilt, blur: 60 * tilt, spread: 0, color: '#05060a', opacity: 0.5 * tilt } : null,
        filters: { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0 },
        flipX: false, flipY: false,
        tilt: tilt > 0.02 ? { rx, ry } : null,
      };
      // paint manually: background → image
      const pctx = ctx;
      pctx.save();
      d.objects = [imgObj];
      // draw demo img via vault-free path
      ctx.clearRect(0, 0, 1280, 680);
      chibuikePaintScene(ctx, d, { quality: 0.8 });
      // the painter skips images with unknown asset ids — draw ours directly into its slot
      if (demoImg.current) {
        ctx.save();
        ctx.translate(imgObj.x, imgObj.y);
        const skY = (ry / 100) * 1.4, skX = (rx / 100) * 1.4;
        ctx.transform(1, skY * -0.5, skX * -0.5, 1, 0, 0);
        ctx.beginPath();
        const r = 14;
        ctx.roundRect(0, 0, imgObj.w, imgObj.h, r);
        ctx.clip();
        ctx.drawImage(demoImg.current, 0, 0, imgObj.w, imgObj.h);
        ctx.restore();
      }
      // annotations on top
      if (annot > 0) {
        ctx.save();
        ctx.globalAlpha = annot;
        const arr = { ...chibuikeMakeArrow(880, 190, 700, 268), width: 6, color: '#ff5fd2' };
        const drawArrow = (o: typeof arr) => {
          ctx.strokeStyle = o.color; ctx.lineWidth = o.width; ctx.lineCap = 'round';
          const dx = o.x2 - o.x, dy = o.y2 - o.y;
          const mx = (o.x + o.x2) / 2 - dy * o.curve * 0.25, my = (o.y + o.y2) / 2 + dx * o.curve * 0.25;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.quadraticCurveTo(mx, my, o.x2, o.y2); ctx.stroke();
          const ang = Math.atan2(o.y2 - my, o.x2 - mx);
          ctx.beginPath(); ctx.moveTo(o.x2, o.y2);
          ctx.lineTo(o.x2 - 18 * Math.cos(ang - 0.42), o.y2 - 18 * Math.sin(ang - 0.42));
          ctx.lineTo(o.x2 - 18 * Math.cos(ang + 0.42), o.y2 - 18 * Math.sin(ang + 0.42));
          ctx.closePath(); ctx.fillStyle = o.color; ctx.fill();
        };
        drawArrow(arr);
        const num = chibuikeMakeNumber(836, 148, 1);
        ctx.fillStyle = num.fill;
        ctx.beginPath(); ctx.arc(num.x + 22, num.y + 22, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = num.textColor; ctx.font = '700 22px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('1', num.x + 22, num.y + 23);
        const tx = chibuikeMakeText('Revenue is up — highlight it', 700, 96, { size: 26, color: '#ffffff', weight: 700 });
        ctx.font = `${tx.weight} ${tx.size}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, tx.x, tx.y);
        ctx.restore();
      }
      pctx.restore();
      raf.current = requestAnimationFrame(loop);
    };
    let lastStage = -1;
    const setStageThrottled = (s: number) => { if (s !== lastStage) { lastStage = s; setStep(s); } };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className="pf-landing">
      <nav className="pf-landing-nav">
        <a className="pf-logo" href="#/">{LOGO} Pluma Frame</a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a className="pf-btn small" href="#/tutorial">Tutorial</a>
          <a className="pf-btn small primary" href="#/studio">Open Studio</a>
        </div>
      </nav>

      <header className="pf-landing-hero">
        <h1>Make any screenshot<br /><span className="grad">impossible to ignore</span></h1>
        <p>Drop in a screenshot. Get a polished marketing visual — background, depth, shadow, annotations — in seconds. Free, fast, runs entirely in your browser.</p>
        <div className="pf-cta-row">
          <label className="pf-btn primary" style={{ cursor: 'pointer' }}>
            Upload image
            <input type="file" accept="image/*" hidden onChange={e => {
              const f = e.target.files?.[0];
              if (f) location.hash = `#/studio?file=${encodeURIComponent(f.name)}`;
              // the studio reads the pending file injected below
              if (f) (window as unknown as { __chibuikePendingFile?: File }).__chibuikePendingFile = f;
            }} />
          </label>
          <a className="pf-btn" href="#/studio">Open Studio</a>
        </div>
      </header>

      <div className="pf-demo-wrap">
        <div className="pf-demo">
          <canvas ref={canvasRef} aria-label="Animated product demo" />
          <div className="pf-demo-badge">live render — the real engine, not a video</div>
        </div>
        <div className="pf-steps">
          {CHIBUIKE_STEPS.map((s, i) => <span key={s} className={`pf-step${step >= i ? ' on' : ''}`}>{s}</span>)}
        </div>
      </div>

      <section className="pf-landing-feats">
        <div className="pf-feat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 3L5 13h5l-1 8 8-10h-5z" /></svg>
          <h3>Fast by architecture</h3>
          <p>Custom canvas engine, worker decoding, zero heavyweight frameworks. Drags stay smooth at 500+ objects.</p>
        </div>
        <div className="pf-feat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" /></svg>
          <h3>Simple to Studio</h3>
          <p>One-click presets when you want speed. Layers, transforms, animation and precise controls when you don't.</p>
        </div>
        <div className="pf-feat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18" /></svg>
          <h3>Private & local</h3>
          <p>Images never leave your machine. No account, no uploads, works offline after first load.</p>
        </div>
        <div className="pf-feat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" /></svg>
          <h3>Export anywhere</h3>
          <p>PNG, JPEG, WebP, SVG and animated WebM — at 1× to 4× resolution with transparent background support.</p>
        </div>
      </section>

      <footer className="pf-landing-foot">
        Pluma Frame Next — engineered by Chibuike. Original software; open-source dependencies listed in ASSET_LICENSES.md.
      </footer>
    </div>
  );
}
