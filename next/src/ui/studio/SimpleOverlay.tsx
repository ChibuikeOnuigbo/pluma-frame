// Chibuike Simple Mode — the friendly layer: presets for background, frame,
// shadow and mockup, then Download. Studio power stays one click away.
import { useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useDraggableBox } from '../Overlay';
import { store, useChibuike } from '../../chibuike/chibuikeStore';
import { chibuikeAssets } from '../../chibuike/chibuikeAssets';
import { chibuikePaletteFromCanvas, chibuikeGradientFromPalette, chibuikeMeshPresets } from '../../chibuike/chibuikeColor';
import type { ChibuikeBackground } from '../../chibuike/chibuikeTypes';
import { chibuikeExportWarnings, chibuikeEncode, chibuikeDownload } from '../../chibuike/chibuikeExport';

const CHIBUIKE_BG_PRESETS: { name: string; make: () => ChibuikeBackground }[] = [
  { name: 'Frost', make: () => ({ type: 'linear', angle: 120, stops: [{ o: 0, color: '#eef1f9' }, { o: 1, color: '#d5dcef' }] }) },
  { name: 'Dusk', make: () => ({ type: 'linear', angle: 140, stops: [{ o: 0, color: '#1c2033' }, { o: 1, color: '#0d0f18' }] }) },
  { name: 'Violet', make: () => ({ type: 'mesh', base: '#12101f', softness: 1.1, points: [{ x: 0.15, y: 0.2, r: 0.55, color: '#6d4df0' }, { x: 0.85, y: 0.3, r: 0.5, color: '#22d3ee' }, { x: 0.5, y: 0.9, r: 0.6, color: '#c04df0' }] }) },
  { name: 'Peach', make: () => ({ type: 'mesh', base: '#fff4ec', softness: 1.2, points: [{ x: 0.2, y: 0.25, r: 0.5, color: '#ffd6c2' }, { x: 0.8, y: 0.45, r: 0.55, color: '#ffb4a2' }, { x: 0.4, y: 0.85, r: 0.5, color: '#ffe8d6' }] }) },
  { name: 'Mint', make: () => ({ type: 'mesh', base: '#f0fdf9', softness: 1.2, points: [{ x: 0.25, y: 0.3, r: 0.5, color: '#99f6e4' }, { x: 0.75, y: 0.6, r: 0.55, color: '#a7f3d0' }, { x: 0.5, y: 0.1, r: 0.4, color: '#bae6fd' }] }) },
  { name: 'Ink dots', make: () => ({ type: 'pattern', kind: 'dots', color: '#a8b3d0', base: '#f5f7fc', scale: 26, opacity: 0.5 }) },
  { name: 'Grid paper', make: () => ({ type: 'pattern', kind: 'grid', color: '#b9c2d8', base: '#fbfcff', scale: 28, opacity: 0.4 }) },
  { name: 'Transparent', make: () => ({ type: 'transparent' }) },
];

const CHIBUIKE_FRAME_PRESETS = [
  { name: 'None', apply: () => store.selected().forEach(o => store.setProp(o.id, { radius: 0, border: null, shadow: null }, 'Frame none')) },
  { name: 'Rounded', apply: () => store.selected().forEach(o => store.setProp(o.id, { radius: 16, border: null }, 'Frame rounded')) },
  { name: 'Card', apply: () => store.selected().forEach(o => store.setProp(o.id, { radius: 14, border: { width: 1, color: 'rgba(255,255,255,0.35)' }, shadow: { x: 0, y: 22, blur: 55, spread: 0, color: '#0b1020', opacity: 0.35 } }, 'Frame card')) },
  { name: 'Floating', apply: () => store.selected().forEach(o => store.setProp(o.id, { radius: 18, shadow: { x: 0, y: 44, blur: 90, spread: 0, color: '#0b1020', opacity: 0.45 } }, 'Frame floating')) },
  { name: 'Outline', apply: () => store.selected().forEach(o => store.setProp(o.id, { radius: 10, border: { width: 2, color: '#14161d' }, shadow: null }, 'Frame outline')) },
];

const CHIBUIKE_MOCKUP_PRESETS = [
  { name: 'Browser', device: 'browser' as const },
  { name: 'Dark', device: 'browser-dark' as const },
  { name: 'Mac', device: 'mac' as const },
  { name: 'Laptop', device: 'laptop' as const },
  { name: 'Phone', device: 'phone' as const },
];

export function SimpleOverlay({ onIngest }: { onIngest: (f: File) => void }) {
  useChibuike();
  const [panel, setPanel] = useState<'presets' | 'background' | 'mockup' | null>('presets');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dockDrag = useDraggableBox();
  const panelDrag = useDraggableBox();
  const sel = store.selected();
  const primary = sel.find(o => o.kind === 'image') ?? sel[0];
  const hasDoc = store.doc.objects.length > 0;

  const randomFromImage = () => {
    const img = store.doc.objects.find(o => o.kind === 'image');
    if (!img || !('assetId' in img) || !img.assetId) { store.toast('Add an image first — the palette comes from its colors.', 'info'); return; }
    const { src } = chibuikeAssets.paintSource(img.assetId, 128);
    if (!src) return;
    const swatches = chibuikePaletteFromCanvas(src);
    const grad = chibuikeGradientFromPalette(swatches);
    store.applyBackground({ type: 'linear', angle: grad.angle, stops: grad.stops });
  };

  const applyMockup = (device: 'browser' | 'browser-dark' | 'mac' | 'laptop' | 'phone') => {
    void (async () => {
      const { chibuikeMakeMockup } = await import('../../chibuike/chibuikeFactories');
      const img = store.doc.objects.find(o => o.kind === 'image') as { assetId: string; x: number; y: number; w: number; h: number } | undefined;
      if (!img) { store.toast('Add an image first — it becomes the screen content.', 'info'); return; }
      const w = device === 'phone' ? store.doc.width * 0.34 : img.w * 1.12;
      const h = device === 'phone' ? w * 2.05 : img.h * 1.25;
      const m = chibuikeMakeMockup(img.x - (w - img.w) / 2, img.y - (h - img.h) / 2, w, h, device, { assetId: img.assetId, name: `${device} mockup` });
      store.transact('Mockup', d => {
        d.objects = d.objects.filter(o => o.id !== img.assetId);
        // keep the original image object too? No — slot it into the mockup and remove the duplicate
        d.objects.push(m);
      });
      store.select([m.id]);
      store.toast(`${device} mockup — your image moved into the screen.`, 'ok');
    })();
  };

  const download = async () => {
    setBusy(true);
    try {
      const es = store.doc.exportSettings;
      const warnings = chibuikeExportWarnings(store.doc, es.scale);
      if (warnings.some(w => w.level === 'warn')) store.toast(warnings.find(w => w.level === 'warn')!.msg, 'warn');
      const blob = await chibuikeEncode(store.doc, es.format, es.scale, es.quality, es.transparent);
      chibuikeDownload(blob, `${store.doc.name || 'pluma'}.${es.format === 'jpeg' ? 'jpg' : es.format}`);
      store.toast('Downloaded', 'ok');
    } catch (err) { store.toast(String(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      {/* top dock */}
      <div className="pf-simple-dock" data-tut="simple-dock" ref={dockDrag.ref} onPointerDown={dockDrag.onPointerDown}
        style={dockDrag.pos ? { left: dockDrag.pos.x, top: dockDrag.pos.y, transform: 'none' } : undefined}>
        <span className="pf-dock-grip" data-drag-handle title="Drag to move"><Icon name="grip" size={14} /></span>
        <button className="pf-icon-btn" title="Upload another image" aria-label="Upload another image" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={15} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onIngest(f); }} />
        {(['presets', 'background', 'mockup'] as const).map(p => (
          <button key={p} className={`pf-icon-btn pf-dock-tab${panel === p ? ' active' : ''}`}
            onClick={() => setPanel(panel === p ? null : p)}>
            {p === 'presets' ? 'Style' : p === 'background' ? 'Background' : 'Mockup'}
          </button>
        ))}
        <div className="pf-sep pf-dock-mode" />
        <button className="pf-icon-btn pf-dock-mode" title="Annotate — arrows, steps, text (Studio tools)" aria-label="Switch to Studio tools" onClick={() => store.setMode('studio')}>
          <Icon name="pen" size={15} />
        </button>
        <button className="pf-btn small primary" onClick={() => void download()} disabled={busy}>
          {busy ? 'Rendering…' : 'Download'}
        </button>
      </div>

      {/* left panel */}
      {panel && (
        <div className="pf-simple-side left" data-tut="simple-panel" ref={panelDrag.ref} onPointerDown={panelDrag.onPointerDown}
          data-drag-handle
          style={panelDrag.pos ? { left: panelDrag.pos.x, top: panelDrag.pos.y, transform: 'none', right: 'auto', bottom: 'auto' } : undefined}>
          <span className="pf-panel-grip" data-drag-handle title="Drag to move"><Icon name="grip" size={13} /></span>
          {panel === 'presets' && (
            <>
              <h4>Frame & shadow</h4>
              <div className="pf-grid3" style={{ marginBottom: 12 }}>
                {CHIBUIKE_FRAME_PRESETS.map(f => (
                  <button key={f.name} className="pf-chip" onClick={() => { f.apply(); store.toast(`${f.name} applied`, 'ok'); }}>{f.name}</button>
                ))}
              </div>
              <h4>Perspective</h4>
              <div className="pf-grid3" style={{ marginBottom: 12 }}>
                <button className="pf-chip" onClick={() => primary && store.setProp(primary.id, { tilt: null }, 'Flat')}>Flat</button>
                <button className="pf-chip" onClick={() => primary && store.setProp(primary.id, { tilt: { rx: 6, ry: -12 } }, 'Tilt')}>Tilted</button>
                <button className="pf-chip" onClick={() => primary && store.setProp(primary.id, { tilt: { rx: 2, ry: -6 } }, 'Tilt')}>Subtle</button>
              </div>
              <h4>Social size</h4>
              <div className="pf-grid3">
                {[['Post', 1600, 900], ['Square', 1080, 1080], ['Story', 1080, 1350]].map(([n, w, h]) => (
                  <button key={n as string} className="pf-chip" onClick={() => store.resizeCanvas(w as number, h as number, 'scale')}>{n as string}</button>
                ))}
              </div>
            </>
          )}
          {panel === 'background' && (
            <>
              <h4>Background</h4>
              <div className="pf-preset-grid" style={{ marginBottom: 12 }}>
                {CHIBUIKE_BG_PRESETS.map(p => {
                  const probe = p.make();
                  const css = probe.type === 'solid' ? probe.color
                    : probe.type === 'linear' ? `linear-gradient(${probe.angle}deg, ${probe.stops.map(s => `${s.color} ${s.o * 100}%`).join(',')})`
                    : probe.type === 'radial' ? `radial-gradient(circle, ${probe.stops.map(s => `${s.color} ${s.o * 100}%`).join(',')})`
                    : probe.type === 'mesh' ? `radial-gradient(circle at 20% 20%, ${probe.points[0].color}, transparent 60%), radial-gradient(circle at 80% 30%, ${probe.points[1].color}, transparent 60%), ${probe.base}`
                    : probe.type === 'pattern' ? `${probe.base}`
                    : 'repeating-conic-gradient(#c9ced9 0% 25%, #e9ecf2 0% 50%) 50%/12px';
                  return (
                    <button key={p.name} className="pf-preset" style={{ background: css }} onClick={() => { store.applyBackground(probe); store.toast(`${p.name} background`, 'ok'); }}>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
              <button className="pf-chip" style={{ width: '100%', marginBottom: 10 }} onClick={randomFromImage}>Match my image</button>
              <h4>Image background</h4>
              <div className="pf-row">
                <label className="pf-chip" style={{ cursor: 'pointer' }}>
                  Use image…
                  <input type="file" accept="image/*" hidden onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void (async () => {
                      const id = await store.ingestImage(f, f.name);
                      store.applyBackground({ type: 'image', assetId: id, fit: 'cover', blur: 0, overlay: null });
                    })();
                  }} />
                </label>
                <button className="pf-chip" onClick={() => {
                  const img = store.doc.objects.find(o => o.kind === 'image') as { assetId?: string } | undefined;
                  if (img?.assetId) store.applyBackground({ type: 'image', assetId: img.assetId, fit: 'cover', blur: 40, overlay: { color: '#0b0d14', opacity: 0.35 } });
                }}>Blurred self</button>
              </div>
              <h4 style={{ marginTop: 12 }}>Mesh presets</h4>
              <div className="pf-grid3">
                {chibuikeMeshPresets.map(m => (
                  <button key={m.name} className="pf-chip" onClick={() => store.applyBackground({ type: 'mesh', base: m.base, softness: 1.1, points: m.points })}>{m.name}</button>
                ))}
              </div>
            </>
          )}
          {panel === 'mockup' && (
            <>
              <h4>Put my image inside…</h4>
              <div className="pf-preset-grid">
                {CHIBUIKE_MOCKUP_PRESETS.map(m => (
                  <button key={m.device} className="pf-preset" style={{ background: 'var(--pf-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}
                    onClick={() => applyMockup(m.device)}>
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
              <div className="pf-tiny pf-muted" style={{ marginTop: 10 }}>The original image becomes the screen content. Everything stays editable in Studio mode.</div>
            </>
          )}
        </div>
      )}

      {!hasDoc && null}
    </>
  );
}
