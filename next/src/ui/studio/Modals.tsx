// Chibuike modals — command palette, export desk, size presets, shortcuts.
// Small, focused surfaces; scroll internally; own their own keys.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useDraggableBox } from '../Overlay';
import { store, useChibuike } from '../../chibuike/chibuikeStore';
import { chibuikeExportWarnings, chibuikeEncode, chibuikeDownload, chibuikeExportSVG, chibuikeExportSizes, CHIBUIKE_SOCIAL_SIZES, CHIBUIKE_DEVICE_SIZES } from '../../chibuike/chibuikeExport';
import { chibuikeEncodeWebM } from '../../chibuike/chibuikeVideo';

function Veil({ onClose, children, wide }: { onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  const drag = useDraggableBox();
  return (
    <div className="pf-modal-veil" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={drag.ref} onPointerDown={drag.onPointerDown} data-drag-handle title="Drag to move"
        className={`pf-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true"
        style={drag.pos ? { position: 'fixed', left: drag.pos.x, top: drag.pos.y, margin: 0 } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

/* ── command palette ────────────────────────────────────────────────────── */
interface Cmd { id: string; label: string; hint?: string; run: () => void; }

export function ChibuikeModals() {
  useChibuike();
  const modal = store.modalOpen;
  const close = () => { store.modalOpen = null; (store as unknown as { exportAnim?: boolean }).exportAnim = false; store.bumpReact(); };
  if (!modal) return null;
  if (modal === 'palette') return <Palette onClose={close} />;
  if (modal === 'export') return <ExportModal onClose={close} />;
  if (modal === 'sizes') return <SizesModal onClose={close} />;
  if (modal === 'shortcuts') return <ShortcutsModal onClose={close} />;
  return null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const cmds: Cmd[] = useMemo(() => {
    const list: Cmd[] = [
      { id: 't.text', label: 'Add text', run: () => store.setTool('text') },
      { id: 't.arrow', label: 'Add arrow', run: () => store.setTool('arrow') },
      { id: 't.blur', label: 'Blur / redact region', run: () => store.setTool('blur') },
      { id: 't.spot', label: 'Spotlight region', run: () => store.setTool('spotlight') },
      { id: 't.step', label: 'Add step number', run: () => store.setTool('number') },
      { id: 't.qr', label: 'Add QR code', run: () => store.setTool('qr') },
      { id: 't.magnify', label: 'Zoom cutout', run: () => store.setTool('magnify') },
      { id: 'o.crop', label: 'Crop selected image', run: () => store.startCrop() },
      { id: 'v.fit', label: 'Fit to screen', run: () => store.fit() },
      { id: 'v.100', label: 'Zoom 100%', run: () => store.zoomTo(1) },
      { id: 'd.dup', label: 'Duplicate selection', run: () => store.duplicateSelection() },
      { id: 'd.group', label: 'Group selection', run: () => store.groupSelection() },
      { id: 'd.style', label: 'Copy style', run: () => store.copyStyle() },
      { id: 'm.simple', label: 'Switch to Simple mode', run: () => store.setMode('simple') },
      { id: 'm.studio', label: 'Switch to Studio mode', run: () => store.setMode('studio') },
      { id: 'p.play', label: 'Play animation', run: () => store.play() },
      { id: 'x.export', label: 'Export…', run: () => { store.modalOpen = 'export'; store.bumpReact(); } },
      { id: 'x.sizes', label: 'Resize canvas / presets…', run: () => { store.modalOpen = 'sizes'; store.bumpReact(); } },
      { id: 'x.keys', label: 'Keyboard shortcuts', run: () => { store.modalOpen = 'shortcuts'; store.bumpReact(); } },
      { id: 'x.save', label: 'Save project', run: () => { store.toast('Autosave runs continuously — use the top bar to download a project file.', 'info'); } },
    ];
    for (const s of CHIBUIKE_SOCIAL_SIZES) {
      list.push({ id: `sz.${s.name}`, label: `Resize: ${s.name} (${s.w}×${s.h})`, run: () => store.resizeCanvas(s.w, s.h, 'scale') });
    }
    return list;
  }, []);
  const filtered = cmds.filter(c => c.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  return (
    <Veil onClose={onClose}>
      <input ref={inputRef} className="pf-palette-input" placeholder="Type a command… (tools, sizes, modes)"
        value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter' && filtered[0]) { filtered[0].run(); onClose(); }
        }} />
      <div className="pf-palette-list">
        {filtered.map(c => (
          <button key={c.id} className="pf-menu-item" onClick={() => { c.run(); onClose(); }}>
            {c.label}
          </button>
        ))}
        {!filtered.length && <div className="pf-empty">Nothing matches “{q}”.</div>}
      </div>
    </Veil>
  );
}

/* ── export ─────────────────────────────────────────────────────────────── */
function ExportModal({ onClose }: { onClose: () => void }) {
  useChibuike();
  const doc = store.doc;
  const es = doc.exportSettings;
  const [busy, setBusy] = useState<string | null>(null);
  const wantAnim = (store as unknown as { exportAnim?: boolean }).exportAnim;
  const warnings = chibuikeExportWarnings(doc, es.scale);
  const setES = (patch: Partial<typeof es>) => store.transact('Export settings', d => { Object.assign(d.exportSettings, patch); });

  const doExport = async (kind: string) => {
    setBusy(kind);
    try {
      if (kind === 'svg') {
        const svg = chibuikeExportSVG(doc, true);
        chibuikeDownload(new Blob([svg], { type: 'image/svg+xml' }), `${doc.name || 'pluma'}.svg`);
      } else if (kind === 'webm') {
        await chibuikeEncodeWebM(doc, store.animDuration, 30, Math.min(900, doc.height), blob => chibuikeDownload(blob, `${doc.name || 'pluma'}.webm`));
      } else {
        const blob = await chibuikeEncode(doc, kind as 'png' | 'jpeg' | 'webp', es.scale, es.quality, es.transparent);
        chibuikeDownload(blob, `${doc.name || 'pluma'}.${kind === 'jpeg' ? 'jpg' : kind}`);
      }
      store.toast(`Exported ${kind.toUpperCase()}`, 'ok');
    } catch (err) { store.toast(`Export failed: ${String(err)}`, 'error'); } finally { setBusy(null); }
  };

  return (
    <Veil onClose={onClose} wide>
      <div className="pf-modal-head"><h3>Export “{doc.name}”</h3><button className="pf-icon-btn" title="Close" aria-label="Close" onClick={onClose}><Icon name="x" size={15} /></button></div>
      <div className="pf-modal-body">
        {warnings.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {warnings.map((w, i) => (
              <div key={i} className="pf-error-panel" style={{ borderColor: w.level === 'warn' ? 'rgba(255,194,71,.5)' : 'var(--pf-border-2)', background: 'rgba(255,194,71,.06)', color: '#ffd98f', marginBottom: 6 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name={w.level === 'warn' ? 'alert' : 'info'} size={15} />
                  <span>{w.msg}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="pf-row" style={{ marginBottom: 10 }}>
          <label className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pf-tiny pf-muted">Resolution — {Math.round(doc.width * es.scale)}×{Math.round(doc.height * es.scale)}</span>
            <div className="pf-seg">
              {[1, 2, 3, 4].map(s => <button key={s} className={es.scale === s ? 'on' : ''} onClick={() => setES({ scale: s })}>{s}×</button>)}
            </div>
          </label>
        </div>
        <div className="pf-row" style={{ marginBottom: 10 }}>
          <label className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pf-tiny pf-muted">Quality (JPEG/WebP)</span>
            <input type="range" min={0.4} max={1} step={0.01} value={es.quality} onChange={e => setES({ quality: parseFloat(e.target.value) })} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'auto', flex: 'none', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={es.transparent} onChange={e => setES({ transparent: e.target.checked })} />
            <span className="pf-tiny pf-muted">Transparent PNG</span>
          </label>
        </div>
        <div className="pf-grid3">
          <button className="pf-btn" disabled={!!busy} onClick={() => void doExport('png')}>{busy === 'png' ? '…' : 'PNG'}</button>
          <button className="pf-btn" disabled={!!busy} onClick={() => void doExport('jpeg')}>{busy === 'jpeg' ? '…' : 'JPEG'}</button>
          <button className="pf-btn" disabled={!!busy} onClick={() => void doExport('webp')}>{busy === 'webp' ? '…' : 'WebP'}</button>
          <button className="pf-btn" disabled={!!busy} onClick={() => void doExport('svg')}>SVG (vector-safe)</button>
          <button className="pf-btn" disabled={!!busy} onClick={() => void doExport('webm')} title="Renders the animated composition">
            {busy === 'webm' ? 'Rendering…' : 'WebM (animation)'}
          </button>
          <button className="pf-btn" disabled title="GIF export is intentionally off — WebM is sharper and far smaller.">GIF (off)</button>
        </div>
        <div className="pf-row" style={{ marginTop: 12 }}>
          <button className="pf-chip" onClick={() => void chibuikeExportSizes(doc, CHIBUIKE_SOCIAL_SIZES.slice(0, 4), Math.min(es.scale, 2), es.format === 'png' ? 'png' : 'png')}>Batch: first 4 social sizes</button>
          <button className="pf-chip" onClick={() => { store.modalOpen = 'sizes'; store.bumpReact(); }}>Size presets…</button>
        </div>
      </div>
      <div className="pf-modal-foot">
        <span className="pf-tiny pf-muted" style={{ marginRight: 'auto' }}>
          Renders offscreen at full resolution — preview zoom never affects output.
        </span>
        <button className="pf-btn small" onClick={onClose}>Close</button>
      </div>
    </Veil>
  );
}

/* ── sizes ──────────────────────────────────────────────────────────────── */
function SizesModal({ onClose }: { onClose: () => void }) {
  useChibuike();
  const [custom, setCustom] = useState({ w: store.doc.width, h: store.doc.height });
  return (
    <Veil onClose={onClose} wide>
      <div className="pf-modal-head"><h3>Canvas sizes</h3><button className="pf-icon-btn" title="Close" aria-label="Close" onClick={onClose}><Icon name="x" size={15} /></button></div>
      <div className="pf-modal-body">
        <h4 className="pf-tiny pf-muted" style={{ textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Social</h4>
        <div className="pf-grid3" style={{ marginBottom: 16 }}>
          {CHIBUIKE_SOCIAL_SIZES.map(s => (
            <button key={s.name} className={`pf-chip${store.doc.width === s.w && store.doc.height === s.h ? ' on' : ''}`}
              onClick={() => { store.resizeCanvas(s.w, s.h, 'scale'); }}>
              {s.name}<br /><span className="pf-tiny pf-muted">{s.w}×{s.h}</span>
            </button>
          ))}
        </div>
        <h4 className="pf-tiny pf-muted" style={{ textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Devices / App Store</h4>
        <div className="pf-grid3" style={{ marginBottom: 16 }}>
          {CHIBUIKE_DEVICE_SIZES.map(s => (
            <button key={s.name} className="pf-chip" onClick={() => store.resizeCanvas(s.w, s.h, 'scale')}>
              {s.name}<br /><span className="pf-tiny pf-muted">{s.w}×{s.h}</span>
            </button>
          ))}
        </div>
        <h4 className="pf-tiny pf-muted" style={{ textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Custom</h4>
        <div className="pf-row">
          <input type="number" value={custom.w} onChange={e => setCustom(c => ({ ...c, w: parseInt(e.target.value) || 0 }))} onKeyDown={e => e.stopPropagation()} style={{ width: 90 }} />
          <span className="pf-muted">×</span>
          <input type="number" value={custom.h} onChange={e => setCustom(c => ({ ...c, h: parseInt(e.target.value) || 0 }))} onKeyDown={e => e.stopPropagation()} style={{ width: 90 }} />
          <button className="pf-chip" onClick={() => { store.resizeCanvas(custom.w, custom.h, 'scale'); }}>Scale content</button>
          <button className="pf-chip" onClick={() => { store.resizeCanvas(custom.w, custom.h, 'raw'); }}>Raw canvas</button>
        </div>
        <p className="pf-tiny pf-muted" style={{ marginTop: 10 }}>
          “Scale content” reflows every object proportionally (auto-resize). “Raw canvas” just changes the artboard.
        </p>
      </div>
    </Veil>
  );
}

/* ── shortcuts ──────────────────────────────────────────────────────────── */
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['V / H', 'Select · Pan'],
    ['T', 'Text'], ['R', 'Rectangle'], ['A', 'Arrow'], ['B', 'Pen'], ['X', 'Blur/redact'], ['C', 'Crop image'],
    ['Space', 'Play / pause animation'],
    ['Ctrl / Cmd Z, Shift Z', 'Undo · Redo'],
    ['Ctrl / Cmd S', 'Save locally'], ['Ctrl / Cmd E', 'Export'], ['Ctrl / Cmd Shift P', 'Command palette'],
    ['Ctrl / Cmd D', 'Duplicate'], ['Ctrl / Cmd G, Shift G', 'Group · Ungroup'],
    ['Ctrl / Cmd C, V, X', 'Copy · Paste · Cut'],
    ['[ · ]', 'Send backward · forward'],
    ['Arrows', 'Nudge (Shift = 10px)'],
    ['0 · 1', 'Fit · 100%'],
    ['Wheel', 'Zoom at cursor'], ['Middle-drag / Space', 'Pan'],
    ['Alt-drag', 'Duplicate-drag'], ['Shift-drag', 'Constrain'],
    ['Enter', 'Edit text'], ['Esc', 'Deselect / cancel'],
  ];
  return (
    <Veil onClose={onClose}>
      <div className="pf-modal-head"><h3>Shortcuts</h3><button className="pf-icon-btn" title="Close" aria-label="Close" onClick={onClose}><Icon name="x" size={15} /></button></div>
      <div className="pf-modal-body">
        {rows.map(([k, v]) => (
          <div key={k} className="pf-row" style={{ justifyContent: 'space-between' }}>
            <kbd>{k}</kbd><span className="pf-muted" style={{ textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </Veil>
  );
}
