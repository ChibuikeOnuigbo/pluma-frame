// Chibuike visual tutorial — real screenshots from the real app, chaptered.
import { useState } from 'react';
import { chibuikeResetTutorial } from './studio/Coach';

const CHAPTERS = [
  { id: 'upload', title: 'Upload & paste', img: '/demo/dashboard.png', body: 'Drop a file, paste from your clipboard, or click Upload on the landing page. The canvas snaps to your image\'s real resolution — your source pixels are preserved for export, always.' },
  { id: 'background', title: 'Backgrounds', img: '/demo/photo.png', body: 'Solid, gradients, mesh gradients, patterns and blurred image backgrounds. “Match my image” samples the real colors inside your screenshot and builds a tasteful gradient from them.' },
  { id: 'mockup', title: 'Mockups', img: '/demo/appui.png', body: 'Wrap your screenshot in a browser, Mac, laptop or phone frame. The frame is procedural — crisp at any zoom — and your image becomes the screen content with cover/contain fitting.' },
  { id: 'annotate', title: 'Annotate', img: '/demo/dashboard.png', body: 'Arrows with curve control, numbered steps, callout bubbles, pixelate/blur redaction, spotlights and zoom cutouts. Everything is an object: move it, restyle it, delete it.' },
  { id: 'layers', title: 'Layers', img: '/demo/photo.png', body: 'The layers tab lists every object top-first. Rename, hide, lock, drag to reorder, group. Select multiple with marquee or Shift-click and align/distribute in one tap.' },
  { id: 'animate', title: 'Animate (lightly)', img: '/demo/appui.png', body: 'Give any object an entrance — fade, pop, slide, blur-in — with duration, delay and easing. Press Space to preview, then export a WebM rendered frame-accurately.' },
  { id: 'export', title: 'Export', img: '/demo/dashboard.png', body: 'PNG / JPEG / WebP at 1×–4× with transparency, SVG for vector-only documents, WebM for animation. The exporter renders offscreen at full resolution — zoom never affects quality.' },
];

export function Tutorial() {
  const [ch, setCh] = useState(0);
  const c = CHAPTERS[ch];
  return (
    <div className="pf-landing" style={{ minHeight: '100vh' }}>
      <nav className="pf-landing-nav">
        <a className="pf-logo" href="#/">
          <svg width="22" height="22" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="8" fill="#12141c" /><path d="M10 22V10h6.2c2.9 0 4.8 1.7 4.8 4.2s-1.9 4.3-4.8 4.3H13V22h-3z" fill="#8b7cff" /></svg>
          Pluma Frame
        </a>
        <a className="pf-btn small primary" href="#/studio">Open Studio</a>
      </nav>
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '10px 24px 60px' }}>
        <h1 style={{ fontSize: 30, letterSpacing: '-0.6px', margin: '18px 0 6px' }}>Learn Pluma in 7 short chapters</h1>
        <p className="pf-muted" style={{ margin: '0 0 22px' }}>Every screenshot below comes from the real app.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {CHAPTERS.map((x, i) => (
            <button key={x.id} className={`pf-chip${i === ch ? ' on' : ''}`} onClick={() => setCh(i)}>{i + 1}. {x.title}</button>
          ))}
        </div>
        <div style={{ border: '1px solid var(--pf-border)', borderRadius: 14, overflow: 'hidden', background: 'var(--pf-panel)' }}>
          <div style={{ maxHeight: 430, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0c11' }}>
            <img src={c.img} alt={c.title} style={{ width: '100%', objectFit: 'cover', objectPosition: 'top' }} loading="lazy" />
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h3 style={{ margin: '0 0 6px' }}>{c.title}</h3>
            <p className="pf-muted" style={{ margin: 0, maxWidth: 720 }}>{c.body}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {ch > 0 && <button className="pf-btn small" onClick={() => setCh(ch - 1)}>← Previous</button>}
          {ch < CHAPTERS.length - 1
            ? <button className="pf-btn small primary" onClick={() => setCh(ch + 1)}>Next chapter →</button>
            : <a className="pf-btn small primary" href="#/studio">Try it now →</a>}
          <button className="pf-btn small" onClick={() => { chibuikeResetTutorial(); location.hash = '#/studio'; location.reload(); }}>
            Restart interactive tutorial in Studio
          </button>
        </div>
      </div>
    </div>
  );
}
