// Chibuike inspector — the contextual right panel. Shows ONLY properties the
// selection actually has. Scrubbable numeric fields everywhere.
import { useEffect, useRef, useState } from 'react';
import { store, useChibuike } from '../../chibuike/chibuikeStore';
import { chibuikeFindObject } from '../../chibuike/chibuikeDoc';
import type { ChibuikeObject } from '../../chibuike/chibuikeTypes';
import { CHIBUIKE_FONTS } from '../../chibuike/chibuikeText';
import { CHIBUIKE_ICONS } from '../../chibuike/chibuikeIcons';
import { Icon } from '../Icon';
import { Select } from '../Overlay';

/* ── primitives ─────────────────────────────────────────────────────────── */
function Num({ value, onChange, unit, step = 1, min, max, label }: {
  value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number; max?: number; label?: string;
}) {
  const [txt, setTxt] = useState(String(Math.round(value * 100) / 100));
  const dragging = useRef(false);
  useEffect(() => { if (!dragging.current) setTxt(String(Math.round(value * 100) / 100)); }, [value]);
  const commit = (s: string) => {
    const v = parseFloat(s);
    if (Number.isFinite(v)) onChange(clamp(v, min, max));
  };
  return (
    <div className="pf-num"
      onPointerDown={e => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        dragging.current = true;
        let last = e.clientX;
        const move = (ev: PointerEvent) => {
          const dx = ev.clientX - last; last = ev.clientX;
          onChange(clamp(value + dx * step * (ev.shiftKey ? 10 : 1), min, max));
        };
        const up = () => { dragging.current = false; removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
        addEventListener('pointermove', move); addEventListener('pointerup', up);
      }}
    >
      <input value={txt} onChange={e => setTxt(e.target.value)}
        onBlur={() => commit(txt)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit(txt); }}
        aria-label={label} />
      {unit && <span className="u">{unit}</span>}
    </div>
  );
}
const clamp = (v: number, lo?: number, hi?: number) => Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, v));

function Slider({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <input type="range" style={{ flex: 1 }} min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))} aria-label={label} />
  );
}

function Color({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const hex = value?.startsWith('#') ? value.slice(0, 7) : '#ffffff';
  return (
    <input type="color" value={hex} onChange={e => onChange(e.target.value)} aria-label={label} title={value} />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="pf-row"><label>{label}</label><div className="grow" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{children}</div></div>;
}

function Section({ title, children, onReset }: { title: string; children: React.ReactNode; onReset?: () => void }) {
  return (
    <div className="pf-sec">
      <div className="pf-sec-head"><span>{title}</span>{onReset && <button onClick={onReset}>reset</button>}</div>
      {children}
    </div>
  );
}

const setP = (id: string, label: string) => (patch: Partial<ChibuikeObject>) => store.setProp(id, patch, label);

/* ── per-kind panels ────────────────────────────────────────────────────── */
function ImageProps({ o }: { o: Extract<ChibuikeObject, { kind: 'image' }> }) {
  const set = setP(o.id, 'Image edit');
  return (
    <>
      <Section title="Frame">
        <Row label="Radius"><Slider label="Corner radius" value={o.radius} min={0} max={120} onChange={v => set({ radius: v })} /><Num value={o.radius} onChange={v => set({ radius: v })} min={0} /></Row>
        <Row label="Border W"><Slider label="Border width" value={o.border?.width ?? 0} min={0} max={20} step={0.5} onChange={v => set({ border: v ? { width: v, color: o.border?.color ?? '#ffffff' } : null })} /></Row>
        {o.border && <Row label="Border"><Color label="Border color" value={o.border.color} onChange={v => set({ border: { ...o.border!, color: v } })} /><span className="pf-tiny pf-muted">{o.border.color}</span></Row>}
        <Row label="Fit">
          <div className="pf-seg grow">
            {(['cover', 'contain', 'fill'] as const).map(f => (
              <button key={f} className={o.fit === f ? 'on' : ''} onClick={() => set({ fit: f })}>{f}</button>
            ))}
          </div>
        </Row>
        <div className="pf-row">
          <button className="pf-chip" onClick={() => store.startCrop()} data-tut="crop">Crop</button>
          <button className="pf-chip" onClick={() => store.resetCrop()}>Reset crop</button>
        </div>
        <div className="pf-row">
          <button className="pf-chip" onClick={() => set({ flipX: !o.flipX })}>Flip H</button>
          <button className="pf-chip" onClick={() => set({ flipY: !o.flipY })}>Flip V</button>
          <button className="pf-chip" onClick={() => set({ rotation: Math.round((o.rotation + 90) % 360) })}>Rotate 90</button>
        </div>
      </Section>
      <Section title="Perspective tilt" onReset={() => set({ tilt: null })}>
        <Row label="Tilt X"><Slider label="Tilt X" value={o.tilt?.rx ?? 0} min={-35} max={35} onChange={v => set({ tilt: { rx: v, ry: o.tilt?.ry ?? 0 } })} /></Row>
        <Row label="Tilt Y"><Slider label="Tilt Y" value={o.tilt?.ry ?? 0} min={-35} max={35} onChange={v => set({ tilt: { rx: o.tilt?.rx ?? 0, ry: v } })} /></Row>
        <div className="pf-row">
          <button className="pf-chip" onClick={() => set({ tilt: { rx: 4, ry: -8 } })}>Slight</button>
          <button className="pf-chip" onClick={() => set({ tilt: { rx: 8, ry: -16 } })}>Card</button>
          <button className="pf-chip" onClick={() => set({ tilt: { rx: 0, ry: -24 } })}>Floating</button>
        </div>
      </Section>
      <Section title="Filters" onReset={() => store.setProp(o.id, { filters: { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0 } }, 'Reset filters')}>
        <Row label="Bright"><Slider label="Brightness" value={o.filters.brightness} min={0.3} max={2} step={0.01} onChange={v => set({ filters: { ...o.filters, brightness: v } })} /></Row>
        <Row label="Contrast"><Slider label="Contrast" value={o.filters.contrast} min={0.3} max={2} step={0.01} onChange={v => set({ filters: { ...o.filters, contrast: v } })} /></Row>
        <Row label="Saturate"><Slider label="Saturation" value={o.filters.saturate} min={0} max={2.5} step={0.01} onChange={v => set({ filters: { ...o.filters, saturate: v } })} /></Row>
        <Row label="Grayscale"><Slider label="Grayscale" value={o.filters.grayscale} min={0} max={1} step={0.01} onChange={v => set({ filters: { ...o.filters, grayscale: v } })} /></Row>
        <Row label="Sepia"><Slider label="Sepia" value={o.filters.sepia} min={0} max={1} step={0.01} onChange={v => set({ filters: { ...o.filters, sepia: v } })} /></Row>
        <Row label="Blur"><Slider label="Blur" value={o.filters.blur} min={0} max={20} step={0.5} onChange={v => set({ filters: { ...o.filters, blur: v } })} /></Row>
        <div className="pf-row">
          {[['Clean', { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0 }],
            ['Warm', { brightness: 1.04, contrast: 1.02, saturate: 1.15, grayscale: 0, sepia: 0.22, hueRotate: -8, blur: 0 }],
            ['Cool', { brightness: 1.02, contrast: 1.05, saturate: 0.9, grayscale: 0, sepia: 0, hueRotate: 12, blur: 0 }],
            ['Mono', { brightness: 1.02, contrast: 1.12, saturate: 0, grayscale: 1, sepia: 0, hueRotate: 0, blur: 0 }],
            ['Soft', { brightness: 1.06, contrast: 0.92, saturate: 1.05, grayscale: 0, sepia: 0.08, hueRotate: 0, blur: 0.4 }],
            ['Film', { brightness: 0.98, contrast: 1.14, saturate: 0.82, grayscale: 0.1, sepia: 0.18, hueRotate: -4, blur: 0 }],
          ].map(([n, f]) => (
            <button key={n as string} className="pf-chip" onClick={() => set({ filters: f as never })}>{n as string}</button>
          ))}
        </div>
      </Section>
      <ShadowSection o={o} />
    </>
  );
}

function ShadowSection({ o }: { o: ChibuikeObject & { shadow: unknown } }) {
  const s = o.shadow as { x: number; y: number; blur: number; spread: number; color: string; opacity: number } | null;
  const set = (patch: Partial<NonNullable<typeof s>>) => store.setProp(o.id, { shadow: s ? { ...s, ...patch } : { x: 0, y: 20, blur: 50, spread: 0, color: '#0b1020', opacity: 0.35, ...patch } } as never, 'Shadow');
  return (
    <Section title="Shadow" onReset={() => store.setProp(o.id, { shadow: null }, 'Reset shadow')}>
      {!s && (
        <div className="pf-row" style={{ flexWrap: 'wrap' }}>
          {[['Soft', { x: 0, y: 18, blur: 40, spread: 0, color: '#0b1020', opacity: 0.3 }],
            ['Medium', { x: 0, y: 24, blur: 60, spread: 0, color: '#0b1020', opacity: 0.4 }],
            ['Hard', { x: 14, y: 14, blur: 0, spread: 0, color: '#0b1020', opacity: 0.9 }],
            ['Long', { x: 0, y: 48, blur: 90, spread: 0, color: '#0b1020', opacity: 0.45 }],
            ['Ambient', { x: 0, y: 10, blur: 24, spread: 2, color: '#0b1020', opacity: 0.22 }],
            ['Glow', { x: 0, y: 0, blur: 44, spread: 4, color: '#7c5cff', opacity: 0.55 }],
          ].map(([n, sh]) => <button key={n as string} className="pf-chip" onClick={() => set(sh as never)}>{n as string}</button>)}
        </div>
      )}
      {s && (
        <>
          <Row label="X"><Num value={s.x} onChange={v => set({ x: v })} /></Row>
          <Row label="Y"><Num value={s.y} onChange={v => set({ y: v })} /></Row>
          <Row label="Blur"><Num value={s.blur} onChange={v => set({ blur: v })} min={0} /></Row>
          <Row label="Opacity"><Slider label="Shadow opacity" value={s.opacity} min={0} max={1} step={0.01} onChange={v => set({ opacity: v })} /></Row>
          <Row label="Color"><Color label="Shadow color" value={s.color} onChange={v => set({ color: v })} /></Row>
        </>
      )}
    </Section>
  );
}

function TextProps({ o }: { o: Extract<ChibuikeObject, { kind: 'text' }> }) {
  const set = setP(o.id, 'Text edit');
  return (
    <>
      <Section title="Type">
        <Row label="Font">
          <Select value={o.font} options={CHIBUIKE_FONTS.map(f => ({ value: f.id, label: f.label }))} onChange={v => set({ font: v })} label="Font" width={undefined as never} />
        </Row>
        <Row label="Size"><Num value={o.size} onChange={v => set({ size: Math.max(6, v) })} min={6} /></Row>
        <Row label="Weight">
          <div className="pf-seg grow">
            {[400, 500, 600, 700, 800].map(w => (
              <button key={w} className={o.weight === w ? 'on' : ''} onClick={() => set({ weight: w })}>{w}</button>
            ))}
          </div>
        </Row>
        <Row label="Align">
          <div className="pf-seg grow">
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a} className={o.align === a ? 'on' : ''} onClick={() => set({ align: a })} aria-label={`Align ${a}`} title={`Align ${a}`}>
                <Icon name={a === 'left' ? 'alignLeft' : a === 'center' ? 'alignCenterH' : 'alignRight'} size={14} />
              </button>
            ))}
          </div>
        </Row>
        <Row label="Spacing"><Num value={o.letterSpacing} onChange={v => set({ letterSpacing: v })} step={0.1} /></Row>
        <Row label="Leading"><Num value={o.lineHeight} onChange={v => set({ lineHeight: Math.max(0.8, v) })} step={0.05} min={0.8} /></Row>
        <Row label="Case">
          <div className="pf-seg grow">
            {(['none', 'upper', 'lower'] as const).map(a => <button key={a} className={o.transform === a ? 'on' : ''} onClick={() => set({ transform: a })}>{a}</button>)}
          </div>
        </Row>
        <Row label="Auto-fit">
          <input type="checkbox" checked={o.autoFit} onChange={e => set({ autoFit: e.target.checked })} id="fit-cb" />
          <label htmlFor="fit-cb" className="pf-tiny pf-muted">shrink to fit box</label>
        </Row>
      </Section>
      <Row label="Color"><Color label="Text color" value={o.color} onChange={v => set({ color: v })} /><span className="pf-tiny pf-muted">{o.color}</span></Row>
      <Section title="Highlight background" onReset={() => set({ bg: null })}>
        <div className="pf-row" style={{ flexWrap: 'wrap' }}>
          <button className="pf-chip" onClick={() => set({ bg: { color: '#ffe94d', padX: 10, padY: 4, radius: 6 } })}>Yellow</button>
          <button className="pf-chip" onClick={() => set({ bg: { color: '#7c5cff', padX: 12, padY: 6, radius: 999 } })}>Purple pill</button>
          <button className="pf-chip" onClick={() => set({ bg: { color: '#0b0d12', padX: 12, padY: 6, radius: 10 } })}>Dark code</button>
          {o.bg && <button className="pf-chip" onClick={() => set({ bg: null })}>None</button>}
        </div>
        {o.bg && <Row label="Pad"><Num value={o.bg.padX} onChange={v => set({ bg: { ...o.bg!, padX: v } })} /></Row>}
      </Section>
      <ShadowSection o={o} />
    </>
  );
}

function ShapeProps({ o }: { o: Extract<ChibuikeObject, { kind: 'rect' | 'ellipse' }> }) {
  const set = setP(o.id, 'Shape edit');
  return (
    <>
      <Section title="Fill">
        <Row label="Fill"><Color label="Fill color" value={o.fill ?? '#7c5cff'} onChange={v => set({ fill: v })} />
          <button className="pf-chip" onClick={() => set({ fill: null })}>None</button></Row>
        {o.kind === 'rect' && <Row label="Radius"><Slider label="Corner radius" value={o.radius} min={0} max={120} onChange={v => set({ radius: v })} /></Row>}
      </Section>
      <Section title="Stroke">
        <Row label="Width"><Slider label="Stroke width" value={o.stroke?.width ?? 0} min={0} max={24} onChange={v => set({ stroke: v ? { width: v, color: o.stroke?.color ?? '#1a1d27' } : null })} /></Row>
        {o.stroke && <Row label="Color"><Color label="Stroke color" value={o.stroke.color} onChange={v => set({ stroke: { ...o.stroke!, color: v } })} /></Row>}
      </Section>
      <ShadowSection o={o} />
    </>
  );
}

function ArrowProps({ o }: { o: Extract<ChibuikeObject, { kind: 'arrow' }> }) {
  const set = setP(o.id, 'Arrow edit');
  return (
    <Section title="Arrow">
      <Row label="Width"><Slider label="Arrow width" value={o.width} min={1} max={30} onChange={v => set({ width: v })} /></Row>
      <Row label="Color"><Color label="Arrow color" value={o.color} onChange={v => set({ color: v })} /></Row>
      <Row label="Curve"><Slider label="Curve" value={o.curve} min={-1.2} max={1.2} step={0.02} onChange={v => set({ curve: v })} /></Row>
      <Row label="Head"><Slider label="Head size" value={o.head} min={0.6} max={3} step={0.05} onChange={v => set({ head: v })} /></Row>
      <Row label="Style">
        <button className={`pf-chip${o.double ? ' on' : ''}`} onClick={() => set({ double: !o.double })}>double</button>
        <button className={`pf-chip${o.dashed ? ' on' : ''}`} onClick={() => set({ dashed: !o.dashed })}>dashed</button>
      </Row>
    </Section>
  );
}

function PenProps({ o }: { o: Extract<ChibuikeObject, { kind: 'pen' }> }) {
  const set = setP(o.id, 'Stroke edit');
  return (
    <Section title="Stroke">
      <Row label="Width"><Slider label="Stroke width" value={o.width} min={1} max={48} onChange={v => set({ width: v })} /></Row>
      <Row label="Opacity"><Slider label="Stroke opacity" value={o.alpha} min={0.05} max={1} step={0.01} onChange={v => set({ alpha: v })} /></Row>
      <Row label="Color"><Color label="Stroke color" value={o.color} onChange={v => set({ color: v })} /></Row>
    </Section>
  );
}

function BlurProps({ o }: { o: Extract<ChibuikeObject, { kind: 'blur' }> }) {
  const set = setP(o.id, 'Redact edit');
  return (
    <Section title="Redaction">
      <Row label="Mode">
        <div className="pf-seg grow">
          {(['pixelate', 'blur', 'solid'] as const).map(m => <button key={m} className={o.mode === m ? 'on' : ''} onClick={() => set({ mode: m })}>{m}</button>)}
        </div>
      </Row>
      <Row label="Shape">
        <div className="pf-seg grow">
          {(['rect', 'ellipse'] as const).map(m => <button key={m} className={o.shape === m ? 'on' : ''} onClick={() => set({ shape: m })}>{m}</button>)}
        </div>
      </Row>
      {o.mode !== 'solid' && <Row label="Strength"><Slider label="Strength" value={o.strength} min={3} max={60} onChange={v => set({ strength: v })} /></Row>}
      {o.mode === 'solid' && <Row label="Color"><Color label="Redaction color" value={o.color} onChange={v => set({ color: v })} /></Row>}
      <Row label="Feather"><Slider label="Feather" value={o.feather} min={0} max={40} onChange={v => set({ feather: v })} /></Row>
    </Section>
  );
}

function SpotlightProps({ o }: { o: Extract<ChibuikeObject, { kind: 'spotlight' }> }) {
  const set = setP(o.id, 'Spotlight edit');
  return (
    <Section title="Spotlight">
      <Row label="Shape">
        <div className="pf-seg grow">
          {(['ellipse', 'rect'] as const).map(m => <button key={m} className={o.shape === m ? 'on' : ''} onClick={() => set({ shape: m })}>{m}</button>)}
        </div>
      </Row>
      <Row label="Dim"><Slider label="Dim" value={o.dim} min={0} max={0.85} step={0.01} onChange={v => set({ dim: v })} /></Row>
      <Row label="Feather"><Slider label="Feather" value={o.feather} min={0} max={90} onChange={v => set({ feather: v })} /></Row>
      <Row label="Ring">
        <Slider label="Ring width" value={o.ring?.width ?? 0} min={0} max={16} onChange={v => set({ ring: v ? { width: v, color: o.ring?.color ?? '#7c5cff' } : null })} />
        {o.ring && <Color label="Ring color" value={o.ring.color} onChange={v => set({ ring: { ...o.ring!, color: v } })} />}
      </Row>
    </Section>
  );
}

function GenericProps({ o }: { o: ChibuikeObject }) {
  switch (o.kind) {
    case 'image': return <ImageProps o={o} />;
    case 'mockup': return <MockupProps o={o} />;
    case 'text': return <TextProps o={o} />;
    case 'rect': case 'ellipse': return <ShapeProps o={o} />;
    case 'arrow': return <ArrowProps o={o} />;
    case 'line': return <LineProps o={o} />;
    case 'pen': return <PenProps o={o} />;
    case 'blur': return <BlurProps o={o} />;
    case 'spotlight': return <SpotlightProps o={o} />;
    case 'number': return <NumberProps o={o} />;
    case 'callout': return <CalloutProps o={o} />;
    case 'qr': return <QrProps o={o} />;
    case 'icon': return <IconProps o={o} />;
    case 'magnify': return <MagnifyProps o={o} />;
    case 'badge': return <BadgeProps o={o} />;
    default: return null;
  }
}

function LineProps({ o }: { o: Extract<ChibuikeObject, { kind: 'line' }> }) {
  const set = setP(o.id, 'Line edit');
  return (
    <Section title="Line">
      <Row label="Width"><Slider label="Line width" value={o.width} min={1} max={30} onChange={v => set({ width: v })} /></Row>
      <Row label="Color"><Color label="Line color" value={o.color} onChange={v => set({ color: v })} /></Row>
    </Section>
  );
}
function NumberProps({ o }: { o: Extract<ChibuikeObject, { kind: 'number' }> }) {
  const set = setP(o.id, 'Step edit');
  return (
    <Section title="Step marker">
      <Row label="Number"><Num value={o.n} onChange={v => set({ n: Math.round(v) })} min={0} /></Row>
      <Row label="Style">
        <div className="pf-seg grow">
          {(['circle', 'square', 'pill'] as const).map(s => <button key={s} className={o.style === s ? 'on' : ''} onClick={() => set({ style: s })}>{s}</button>)}
        </div>
      </Row>
      <Row label="Fill"><Color label="Fill" value={o.fill} onChange={v => set({ fill: v })} /></Row>
      <Row label="Text"><Color label="Text" value={o.textColor} onChange={v => set({ textColor: v })} /></Row>
      <Row label="Size"><Num value={o.fontSize} onChange={v => set({ fontSize: v })} min={8} /></Row>
    </Section>
  );
}
function CalloutProps({ o }: { o: Extract<ChibuikeObject, { kind: 'callout' }> }) {
  const set = setP(o.id, 'Callout edit');
  return (
    <Section title="Callout">
      <Row label="Text"><input type="text" value={o.text} onChange={e => set({ text: e.target.value })} onKeyDown={e => e.stopPropagation()} /></Row>
      <Row label="Size"><Num value={o.fontSize} onChange={v => set({ fontSize: v })} min={8} /></Row>
      <Row label="Radius"><Slider label="Radius" value={o.radius} min={0} max={40} onChange={v => set({ radius: v })} /></Row>
      <Row label="Tail">
        <div className="pf-seg grow">
          {(['tl', 'tr', 'bl', 'br'] as const).map(t => <button key={t} className={o.tail === t ? 'on' : ''} onClick={() => set({ tail: t })}>{t}</button>)}
        </div>
      </Row>
      <Row label="Fill"><Color label="Fill" value={o.fill} onChange={v => set({ fill: v })} /></Row>
      <Row label="Text"><Color label="Text color" value={o.textColor} onChange={v => set({ textColor: v })} /></Row>
    </Section>
  );
}
function QrProps({ o }: { o: Extract<ChibuikeObject, { kind: 'qr' }> }) {
  const set = setP(o.id, 'QR edit');
  return (
    <Section title="QR code">
      <Row label="Data"><input type="text" value={o.data} onChange={e => set({ data: e.target.value })} onKeyDown={e => e.stopPropagation()} placeholder="https://…" /></Row>
      <Row label="Colors"><Color label="Dark" value={o.dark} onChange={v => set({ dark: v })} /><Color label="Light" value={o.light} onChange={v => set({ light: v })} /></Row>
      <Row label="EC">
        <div className="pf-seg grow">
          {(['L', 'M', 'Q', 'H'] as const).map(e => <button key={e} className={o.ec === e ? 'on' : ''} onClick={() => set({ ec: e })}>{e}</button>)}
        </div>
      </Row>
      <Row label="Quiet"><Num value={o.quiet} onChange={v => set({ quiet: Math.max(0, Math.round(v)) })} min={0} max={6} /></Row>
    </Section>
  );
}
function IconProps({ o }: { o: Extract<ChibuikeObject, { kind: 'icon' }> }) {
  const set = setP(o.id, 'Icon edit');
  return (
    <Section title="Icon">
      <Row label="Fill"><Color label="Fill" value={o.fill} onChange={v => set({ fill: v })} /></Row>
      <Row label="Swap">
        <div className="pf-grid5">
          {CHIBUIKE_ICONS.slice(0, 10).map(ic => (
            <button key={ic.name} title={ic.name} className="pf-icon-tile" aria-label={ic.name}
              onClick={() => set({ path: ic.path })}>
              <svg width="15" height="15" viewBox="0 0 24 24"><path d={ic.path} fill="currentColor" /></svg>
            </button>
          ))}
        </div>
      </Row>
      <div className="pf-tiny pf-muted">Use the rail's icon tool for the full searchable library.</div>
    </Section>
  );
}
function MagnifyProps({ o }: { o: Extract<ChibuikeObject, { kind: 'magnify' }> }) {
  const set = setP(o.id, 'Zoom edit');
  return (
    <Section title="Zoom cutout">
      <Row label="Region"><Num value={Math.round(o.srcRect.sw)} onChange={v => set({ srcRect: { ...o.srcRect, sw: Math.max(8, v), sh: Math.max(8, v * (o.srcRect.sh / o.srcRect.sw)) } })} min={8} /></Row>
      <Row label="Ring"><Color label="Ring color" value={o.ring.color} onChange={v => set({ ring: { ...o.ring, color: v } })} /></Row>
      <div className="pf-tiny pf-muted">Move the source region by re-adding the cutout on the image.</div>
    </Section>
  );
}
function BadgeProps({ o }: { o: Extract<ChibuikeObject, { kind: 'badge' }> }) {
  const set = setP(o.id, 'Badge edit');
  return (
    <Section title="Badge">
      <Row label="Top"><input type="text" value={o.top} onChange={e => set({ top: e.target.value })} onKeyDown={e => e.stopPropagation()} /></Row>
      <Row label="Bottom"><input type="text" value={o.bottom} onChange={e => set({ bottom: e.target.value })} onKeyDown={e => e.stopPropagation()} /></Row>
      <Row label="Fill"><Color label="Fill" value={o.fill} onChange={v => set({ fill: v })} /></Row>
      <Row label="Text"><Color label="Text" value={o.textColor} onChange={v => set({ textColor: v })} /></Row>
    </Section>
  );
}
function MockupProps({ o }: { o: Extract<ChibuikeObject, { kind: 'mockup' }> }) {
  const set = setP(o.id, 'Mockup edit');
  return (
    <>
      <Section title="Device">
        <Row label="Device">
          <Select value={o.device} options={(['browser','browser-dark','mac','laptop','phone'] as const).map(d => ({ value: d, label: d === 'browser-dark' ? 'Browser dark' : d[0].toUpperCase()+d.slice(1) }))} onChange={v => set({ device: v })} label="Device" />
        </Row>
        {o.device.startsWith('browser') && <Row label="URL"><input type="text" value={o.urlText} onChange={e => set({ urlText: e.target.value })} onKeyDown={e => e.stopPropagation()} /></Row>}
        <Row label="Fit">
          <div className="pf-seg grow">
            {(['cover', 'contain'] as const).map(f => <button key={f} className={o.fit === f ? 'on' : ''} onClick={() => set({ fit: f })}>{f}</button>)}
          </div>
        </Row>
      </Section>
      <Section title="Perspective tilt" onReset={() => set({ tilt: null })}>
        <Row label="Tilt X"><Slider label="Tilt X" value={o.tilt?.rx ?? 0} min={-35} max={35} onChange={v => set({ tilt: { rx: v, ry: o.tilt?.ry ?? 0 } })} /></Row>
        <Row label="Tilt Y"><Slider label="Tilt Y" value={o.tilt?.ry ?? 0} min={-35} max={35} onChange={v => set({ tilt: { rx: o.tilt?.rx ?? 0, ry: v } })} /></Row>
        <div className="pf-row">
          <button className="pf-chip" onClick={() => set({ tilt: { rx: 5, ry: -10 } })}>Card</button>
          <button className="pf-chip" onClick={() => set({ tilt: { rx: 2, ry: -6 } })}>Slight</button>
        </div>
      </Section>
      <ShadowSection o={o} />
    </>
  );
}

/* ── transform section (all kinds) ──────────────────────────────────────── */
function TransformProps({ o }: { o: ChibuikeObject }) {
  const set = setP(o.id, 'Transform');
  return (
    <Section title="Transform">
      <div className="pf-grid2">
        <Row label="X"><Num value={Math.round(o.x)} onChange={v => set({ x: v })} /></Row>
        <Row label="Y"><Num value={Math.round(o.y)} onChange={v => set({ y: v })} /></Row>
      </div>
      <div className="pf-grid2">
        <Row label="W"><Num value={Math.round(o.w)} onChange={v => set({ w: Math.max(2, v) })} min={2} /></Row>
        <Row label="H"><Num value={Math.round(o.h)} onChange={v => set({ h: Math.max(2, v) })} min={2} /></Row>
      </div>
      <Row label="Rotation"><Slider label="Rotation" value={o.rotation} min={-180} max={180} onChange={v => set({ rotation: v })} /><Num value={o.rotation} onChange={v => set({ rotation: v })} unit="°" /></Row>
      <Row label="Opacity"><Slider label="Opacity" value={o.opacity} min={0} max={1} step={0.01} onChange={v => set({ opacity: v })} /></Row>
      <Row label="Blend">
        <Select value={o.blend} options={(['normal','multiply','screen','overlay','soft-light','difference'] as const).map(b => ({ value: b, label: b[0].toUpperCase()+b.slice(1) }))} onChange={v => set({ blend: v })} label="Blend mode" />
      </Row>
    </Section>
  );
}

function ArrangeSection() {
  const alignSvg = (d: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={d} /></svg>
  );
  const ALIGN: Record<string, { icon: ReturnType<typeof alignSvg>; label: string }> = {
    left: { icon: alignSvg('M4 3v18M7 7h12v10H7z'), label: 'Align left' },
    hcenter: { icon: alignSvg('M12 3v18M6 7h12v10H6z'), label: 'Center horizontally' },
    right: { icon: alignSvg('M20 3v18M5 7h12v10H5z'), label: 'Align right' },
    top: { icon: alignSvg('M3 4h18M7 7h10v12H7z'), label: 'Align top' },
    vcenter: { icon: alignSvg('M3 12h18M7 6h10v12H7z'), label: 'Center vertically' },
    bottom: { icon: alignSvg('M3 20h18M7 5h10v12H7z'), label: 'Align bottom' },
  };
  return (
    <Section title="Arrange">
      <div className="pf-grid4">
        <button className="pf-sq" title="Bring to front" aria-label="Bring to front" onClick={() => store.reorder('front')}><Icon name="toFront" size={15} /></button>
        <button className="pf-sq" title="Bring forward" aria-label="Bring forward" onClick={() => store.reorder('forward')}><Icon name="up" size={15} /></button>
        <button className="pf-sq" title="Send backward" aria-label="Send backward" onClick={() => store.reorder('backward')}><Icon name="down" size={15} /></button>
        <button className="pf-sq" title="Send to back" aria-label="Send to back" onClick={() => store.reorder('back')}><Icon name="toBack" size={15} /></button>
      </div>
      <div className="pf-grid3">
        {(['left', 'hcenter', 'right'] as const).map(k => (
          <button key={k} className="pf-chip" title={ALIGN[k].label} aria-label={ALIGN[k].label} onClick={() => store.align(k)}>{ALIGN[k].icon}</button>
        ))}
      </div>
      <div className="pf-grid3">
        {(['top', 'vcenter', 'bottom'] as const).map(k => (
          <button key={k} className="pf-chip" title={ALIGN[k].label} aria-label={ALIGN[k].label} onClick={() => store.align(k)}>{ALIGN[k].icon}</button>
        ))}
      </div>
      {store.selected().length > 2 && (
        <div className="pf-grid2">
          <button className="pf-chip" onClick={() => store.distribute('h')}><Icon name="distributeH" size={13} /> Distribute</button>
          <button className="pf-chip" onClick={() => store.distribute('v')}><Icon name="distributeV" size={13} /> Distribute</button>
        </div>
      )}
      <div className="pf-grid2">
        <button className="pf-chip" onClick={() => store.groupSelection()}>Group</button>
        <button className="pf-chip" onClick={() => store.ungroupSelection()}>Ungroup</button>
      </div>
      <div className="pf-grid2">
        <button className="pf-chip" onClick={() => store.copyStyle()}>Copy style</button>
        <button className="pf-chip" onClick={() => store.pasteStyle()}>Paste style</button>
      </div>
    </Section>
  );
}

/* ── layers tab ─────────────────────────────────────────────────────────── */
function LayersPanel() {
  const rev = useChibuike();
  const [renaming, setRenaming] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const list = store.doc.objects;
  void rev;
  return (
    <div className="pf-layers" data-tut="layers">
      {list.length === 0 && <div className="pf-empty">No objects yet.<br />Add an image or annotation.</div>}
      {[...list].reverse().map(o => {
        const sel = store.selection.includes(o.id);
        return (
          <div
            key={o.id}
            className={`pf-layer-row${sel ? ' sel' : ''}`}
            draggable={renaming !== o.id}
            onDragStart={() => { dragId.current = o.id; }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={e => e.currentTarget.classList.remove('dragover')}
            onDrop={e => {
              e.currentTarget.classList.remove('dragover');
              e.preventDefault();
              e.stopPropagation();
              if (dragId.current && dragId.current !== o.id) {
                const from = list.findIndex(x => x.id === dragId.current);
                const to = list.findIndex(x => x.id === o.id);
                store.moveLayerTo(dragId.current, to > from ? to + 1 : to);
              }
              dragId.current = null;
            }}
            onClick={e => store.select([o.id], e.shiftKey)}
            onDoubleClick={() => setRenaming(o.id)}
          >
            <button
              className="pf-icon-btn sm" title={o.visible ? 'Hide' : 'Show'} aria-label={o.visible ? 'Hide layer' : 'Show layer'}
              onClick={e => { e.stopPropagation(); store.toggleVisible([o.id]); }}
            >
              <Icon name={o.visible ? 'eye' : 'eyeOff'} size={13} />
            </button>
            {renaming === o.id ? (
              <input type="text" defaultValue={o.name} autoFocus
                onBlur={e => { store.setProp(o.id, { name: e.target.value || o.kind }, 'Rename'); setRenaming(null); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            ) : <span className="nm">{o.name}</span>}
            <span className="k"><KindGlyph kind={o.kind} /></span>
            <button
              className="pf-icon-btn sm" title={o.locked ? 'Unlock' : 'Lock'} aria-label={o.locked ? 'Unlock layer' : 'Lock layer'}
              onClick={e => { e.stopPropagation(); store.toggleLock([o.id]); }}
            >
              <Icon name={o.locked ? 'lock' : 'unlock'} size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function KindGlyph({ kind }: { kind: string }) {
  const map: Record<string, Parameters<typeof Icon>[0]['name']> = {
    image: 'image', text: 'type', rect: 'square', ellipse: 'circle', line: 'line', arrow: 'arrow', pen: 'pen',
    blur: 'pixels', spotlight: 'focus', number: 'steps', callout: 'message', qr: 'qr', icon: 'star', mockup: 'monitor', magnify: 'zoomSearch', badge: 'badge',
  };
  return <span className="pf-kind"><Icon name={map[kind] ?? 'square'} size={12} /></span>;
}

/* ── animate tab ────────────────────────────────────────────────────────── */
function AnimatePanel() {
  useChibuike();
  const sel = store.selected();
  const [o] = sel;
  const presets = ['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale', 'pop', 'bounce', 'shake', 'rotate', 'blur-in', 'float', 'pulse', 'wipe'] as const;
  return (
    <div data-tut="animate">
      {!o ? <div className="pf-empty">Select an object to animate it.</div> : (
        <Section title={`Animation — ${o.name}`} onReset={() => store.setProp(o.id, { anim: null }, 'Remove animation')}>
          <div className="pf-row" style={{ flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button key={p} className={`pf-chip${o.anim?.preset === p ? ' on' : ''}`}
                onClick={() => store.setProp(o.id, { anim: { preset: p, duration: 0.8, delay: 0, easing: p === 'bounce' ? 'bounce-out' : p === 'pop' ? 'back-out' : 'ease-out', loop: p === 'float' || p === 'pulse' } }, 'Animation')}>
                {p}
              </button>
            ))}
          </div>
          {o.anim && o.anim.preset !== 'none' && (
            <>
              <Row label="Duration"><Slider label="Duration" value={o.anim.duration} min={0.2} max={4} step={0.05} onChange={v => store.setProp(o.id, { anim: { ...o.anim!, duration: v } }, 'Duration')} /><Num value={o.anim.duration} onChange={v => store.setProp(o.id, { anim: { ...o.anim!, duration: v } }, 'Duration')} unit="s" step={0.05} min={0.1} /></Row>
              <Row label="Delay"><Slider label="Delay" value={o.anim.delay} min={0} max={4} step={0.05} onChange={v => store.setProp(o.id, { anim: { ...o.anim!, delay: v } }, 'Delay')} /><Num value={o.anim.delay} onChange={v => store.setProp(o.id, { anim: { ...o.anim!, delay: v } }, 'Delay')} unit="s" step={0.05} min={0} /></Row>
              <Row label="Easing">
                <Select value={o.anim.easing} options={(['linear','ease','ease-out','ease-in','ease-in-out','spring','bounce-out','back-out'] as const).map(e => ({ value: e, label: e }))} onChange={v => store.setProp(o.id, { anim: { ...o.anim!, easing: v } }, 'Easing')} label="Easing" />
              </Row>
              <Row label="Loop"><input type="checkbox" checked={o.anim.loop} onChange={e => store.setProp(o.id, { anim: { ...o.anim!, loop: e.target.checked } }, 'Loop')} /><span className="pf-tiny pf-muted">float · pulse · shake</span></Row>
              <div className="pf-row">
                <button className="pf-chip" onClick={() => {
                  // stagger: spread delays across all animated objects by z-order
                  const anims = store.doc.objects.filter(x => x.anim);
                  store.transact('Stagger', () => {
                    anims.forEach((x, i) => { x.anim!.delay = i * 0.15; });
                  });
                }}>Stagger all</button>
                <button className="pf-chip" onClick={() => store.play()}>Preview</button>
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  );
}

/* ── doc panel (canvas settings) ────────────────────────────────────────── */
function DocPanel() {
  useChibuike();
  const d = store.doc;
  return (
    <>
      <Section title="Canvas">
        <div className="pf-grid2">
          <Row label="W"><Num value={d.width} onChange={v => store.resizeCanvas(Math.max(16, Math.round(v)), d.height, 'raw')} min={16} /></Row>
          <Row label="H"><Num value={d.height} onChange={v => store.resizeCanvas(d.width, Math.max(16, Math.round(v)), 'raw')} min={16} /></Row>
        </div>
        <div className="pf-row" style={{ flexWrap: 'wrap' }}>
          {['X 1600×900', 'IG 1080×1080', 'X 1080×1350'].map(s => {
            const [n, dims] = s.split(' ');
            const [w, h] = dims.split('×').map(Number);
            return <button key={s} className="pf-chip" onClick={() => store.resizeCanvas(w, h, 'scale')}>{n} {w}×{h}</button>;
          })}
          <button className="pf-chip" onClick={() => { store.modalOpen = 'sizes'; store.bumpReact(); }}>All sizes…</button>
        </div>
        <Row label="Snap"><input type="checkbox" checked={d.guides.snap} onChange={e => store.transact('Snap', dd => { dd.guides.snap = e.target.checked; })} /><span className="pf-tiny pf-muted">smart guides</span></Row>
      </Section>
      <GridSection />
      <WatermarkSection />
    </>
  );
}

function GridSection() {
  useChibuike();
  const g = store.gridOverlay;
  return (
    <Section title="Grid overlay">
      <Row label="Show"><input type="checkbox" checked={g.enabled} onChange={e => store.setGridOverlay({ enabled: e.target.checked })} /><span className="pf-tiny pf-muted">editor only, never exported</span></Row>
      <Row label="Spacing"><Slider label="Grid spacing" value={g.spacing} min={8} max={200} onChange={v => store.setGridOverlay({ spacing: v })} /></Row>
      <Row label="Opacity"><Slider label="Grid opacity" value={g.opacity} min={0.03} max={0.5} step={0.01} onChange={v => store.setGridOverlay({ opacity: v })} /></Row>
      <Row label="Major"><Num value={g.majorEvery} onChange={v => store.setGridOverlay({ majorEvery: Math.max(2, Math.round(v)) })} min={2} /></Row>
      <Row label="Color"><Color label="Grid color" value={g.color} onChange={v => store.setGridOverlay({ color: v })} /></Row>
    </Section>
  );
}

function WatermarkSection() {
  useChibuike();
  const w = store.doc.watermark;
  return (
    <Section title="Watermark" onReset={() => store.setWatermark(null)}>
      <Row label="Text"><input type="text" value={w?.text ?? ''} placeholder="@yourbrand" onChange={e => store.setWatermark({ text: e.target.value, position: w?.position ?? 8, size: w?.size ?? 22, opacity: w?.opacity ?? 0.5, color: w?.color ?? '#ffffff', margin: w?.margin ?? 28 })} onKeyDown={e => e.stopPropagation()} /></Row>
      {w && (
        <>
          <Row label="Position">
            <Select value={String(w.position)} options={[0,1,2,3,4,5,6,7,8].map(p => ({ value: String(p), label: ['Top left','Top','Top right','Left','Center','Right','Bottom left','Bottom','Bottom right'][p] }))} onChange={v => store.setWatermark({ ...w, position: Number(v) as never })} label="Watermark position" />
          </Row>
          <Row label="Size"><Slider label="Watermark size" value={w.size} min={10} max={80} onChange={v => store.setWatermark({ ...w, size: v })} /></Row>
          <Row label="Opacity"><Slider label="Watermark opacity" value={w.opacity} min={0.05} max={1} step={0.01} onChange={v => store.setWatermark({ ...w, opacity: v })} /></Row>
          <Row label="Color"><Color label="Watermark color" value={w.color} onChange={v => store.setWatermark({ ...w, color: v })} /></Row>
        </>
      )}
    </Section>
  );
}

/* ── the inspector shell ────────────────────────────────────────────────── */
export function Inspector() {
  useChibuike();
  const sel = store.selected();
  const tab = store.rightTab;
  const o = sel.length === 1 ? sel[0] : null;
  const multi = sel.length > 1;
  return (
    <aside className="pf-inspector" data-tut="inspector">
      <div className="pf-inspector-tabs">
        {(['properties', 'layers', 'animate'] as const).map(t => (
          <button key={t} className={`pf-itab${tab === t ? ' on' : ''}`} onClick={() => store.setRightTab(t)}>
            {t === 'properties' ? `Properties${sel.length ? ` (${sel.length})` : ''}` : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="pf-inspector-body">
        {tab === 'layers' && <LayersPanel />}
        {tab === 'animate' && <AnimatePanel />}
        {tab === 'properties' && (
          <>
            {multi && (
              <>
                <div className="pf-empty">{sel.length} objects selected</div>
                <ArrangeSection />
                <div className="pf-grid2">
                  <button className="pf-chip" onClick={() => store.groupSelection()}>Group</button>
                  <button className="pf-chip" onClick={() => store.deleteSelection()}>Delete</button>
                </div>
              </>
            )}
            {!o && !multi && <DocPanel />}
            {o && (
              <>
                <TransformProps o={o} />
                <GenericProps o={o} />
                <ArrangeSection />
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
