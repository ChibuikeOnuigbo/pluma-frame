/**
 * Chibuike coach — the interactive guided tutorial.
 * Highlights real elements via [data-tut], dims the rest, advances ONLY on
 * the real user action (never a timer), stores progress locally, supports
 * skip, and nudges with a short hint on wrong clicks.
 */
import { useEffect, useRef, useState } from 'react';
import { store, useChibuike } from '../../chibuike/chibuikeStore';

interface Step {
  target: string;          // [data-tut] key
  title: string;
  body: string;
  /** event we wait for; verified against the live store */
  waitFor: () => boolean;
  poll?: number;
}

const CHIBUIKE_TUTORIAL_KEY = 'chibuike.tutorial.v1';

export function chibuikeTutorialDone(): boolean {
  try { return localStorage.getItem(CHIBUIKE_TUTORIAL_KEY) === 'done'; } catch { return false; }
}
export function chibuikeResetTutorial(): void {
  try { localStorage.removeItem(CHIBUIKE_TUTORIAL_KEY); } catch { /* private mode */ }
}

const STEPS: Step[] = [
  {
    target: 'canvas',
    title: '1 · Add your screenshot',
    body: 'Drop or paste an image — or click the upload icon in the tool rail. The canvas resizes to fit it.',
    waitFor: () => store.doc.objects.some(o => o.kind === 'image'),
  },
  {
    target: 'simple-panel',
    title: '2 · Style it in one click',
    body: 'Open the Style panel in Simple mode and try a frame preset — rounded corners plus a soft shadow.',
    waitFor: () => store.doc.objects.some(o => o.kind === 'image' && (o.radius > 0 || o.shadow !== null)),
  },
  {
    target: 'simple-panel',
    title: '3 · A background that fits',
    body: 'Switch to the Background panel. Pick a mesh, or press “Match my image” to derive colors from your screenshot.',
    waitFor: () => store.doc.background.type !== 'solid',
  },
  {
    target: 'mode',
    title: '4 · Open Studio mode',
    body: 'When you need arrows, steps or layers, click this toggle — the same document, full power.',
    waitFor: () => store.uiMode === 'studio',
  },
  {
    target: 'rail',
    title: '5 · Annotate',
    body: 'Pick the arrow tool (A) and drag on the canvas. Steps, callouts and blur work the same way.',
    waitFor: () => store.doc.objects.some(o => o.kind !== 'image' && o.kind !== 'mockup'),
  },
  {
    target: 'export',
    title: '6 · Export',
    body: 'Download a PNG at 1×–4×, copy to clipboard, or render an animated WebM. That’s the whole loop.',
    waitFor: () => false, // final step — Finish button only
  },
];

export function Coach({ onDone }: { onDone: () => void }) {
  useChibuike();
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [hint, setHint] = useState(false);
  const wrongRef = useRef(0);

  const s = STEPS[step];

  useEffect(() => {
    const find = () => document.querySelector(`[data-tut="${s.target}"]`) as HTMLElement | null;
    const update = () => {
      const el = find();
      setBox(el ? el.getBoundingClientRect() : null);
    };
    update();
    const iv = setInterval(update, 400);
    return () => clearInterval(iv);
  }, [s.target]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (s.waitFor()) {
        setHint(false);
        if (step < STEPS.length - 1) setStep(v => v + 1);
        else finish();
      }
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (step === STEPS.length - 1) return;
      const el = document.querySelector(`[data-tut="${s.target}"]`);
      if (el && !el.contains(e.target as Node)) {
        wrongRef.current++;
        setHint(true);
        setTimeout(() => setHint(false), 1600);
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [s.target, step]);

  const finish = () => {
    try { localStorage.setItem(CHIBUIKE_TUTORIAL_KEY, 'done'); } catch { /* private mode */ }
    onDone();
  };

  const pos = (() => {
    if (!box) return { left: '50%', top: '80px', transform: 'translateX(-50%)' };
    const W = 292;
    let left = box.right + 12;
    if (left + W > innerWidth - 12) left = Math.max(12, box.left - W - 12);
    let top = Math.min(Math.max(12, box.top), innerHeight - 190);
    return { left: `${left}px`, top: `${top}px` };
  })();

  return (
    <>
      {/* dimmer with a cut-out over the target */}
      {box && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 290, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,5,9,0.55)', clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${box.left - 8}px ${box.top - 8}px, ${box.left - 8}px ${box.bottom + 8}px, ${box.right + 8}px ${box.bottom + 8}px, ${box.right + 8}px ${box.top - 8}px, ${box.left - 8}px ${box.top - 8}px)`, transition: 'all .2s ease' }} />
          <div style={{ position: 'absolute', left: box.left - 8, top: box.top - 8, width: box.width + 16, height: box.height + 16, border: '2px solid var(--pf-accent)', borderRadius: 12, boxShadow: '0 0 0 4000px rgba(4,5,9,0)', animation: 'pf-pulse 1.6s infinite' }} />
        </div>
      )}
      <style>{`@keyframes pf-pulse { 0%,100% { outline-offset: 0px; } 50% { outline: 3px solid rgba(124,92,255,.6); outline-offset: 4px; } }`}</style>
      <div className="pf-coach" style={{ ...pos, position: 'fixed' }} role="dialog" aria-live="polite">
        <h5>{s.title}</h5>
        <div>{s.body}</div>
        {hint && <div className="pf-coach-hint">Not there yet — {step === 0 ? 'add an image first' : 'try the highlighted control'}.</div>}
        <div className="row">
          <span className="pf-tiny pf-muted" style={{ marginRight: 'auto', alignSelf: 'center' }}>{step + 1} / {STEPS.length}</span>
          <button className="pf-chip" onClick={finish}>Skip</button>
          {step === STEPS.length - 1 && <button className="pf-btn small primary" onClick={finish}>Finish</button>}
          {step > 0 && <button className="pf-chip" onClick={() => setStep(v => v - 1)}>Back</button>}
        </div>
      </div>
    </>
  );
}
