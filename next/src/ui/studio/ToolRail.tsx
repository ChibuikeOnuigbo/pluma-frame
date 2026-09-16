// Chibuike tool rail — one compact column, grouped tools, tooltip + shortcut.
import { useEffect, useRef, useState } from 'react';
import { store, useChibuike, ChibuikeTool } from '../../chibuike/chibuikeStore';
import { chibuikeMakeImage } from '../../chibuike/chibuikeFactories';
import { chibuikeAssets } from '../../chibuike/chibuikeAssets';

interface ToolDef { id: ChibuikeTool | '@crop' | '@mockup' | '@image' | '@iconpick'; label: string; sc: string; icon: JSX.Element; }

const svg = (d: string, stroke = true) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={stroke ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const CHIBUIKE_TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select & transform', sc: 'V', icon: svg('M6 3l12 8-5.5 1L15 19l-3 1-2.5-6.5L6 17z') },
  { id: 'hand', label: 'Pan canvas', sc: 'H · Space-drag', icon: svg('M9 11V5a1.5 1.5 0 013 0v6m0-3a1.5 1.5 0 013 0v3m0-1a1.5 1.5 0 013 0v5a6 6 0 01-6 6h-1a6 6 0 01-6-6v-3a1.5 1.5 0 013 0') },
  { id: '@crop', label: 'Crop image', sc: 'C', icon: svg('M7 3v14a1 1 0 001 1h13M3 7h14a1 1 0 011 1v13') },
  { id: '@image', label: 'Add image', sc: 'drop or paste', icon: svg('M4 5h16v14H4zM4 15l4-4 3 3 3-3 6 6M9.5 9.5a1 1 0 100-2 1 1 0 000 2') },
  { id: 'text', label: 'Text', sc: 'T', icon: svg('M5 6h14M12 6v13M9 19h6') },
  { id: 'callout', label: 'Callout bubble', sc: 'U', icon: svg('M4 5h16v10H10l-5 4v-4H4z') },
  { id: 'number', label: 'Step number', sc: 'N', icon: svg('M12 3a9 9 0 100 18 9 9 0 000-18zm-2 6.5a2 2 0 114 0c0 1.5-4 2.5-4 5h4') },
  { id: 'badge', label: 'Store badge', sc: '', icon: svg('M5 5h14v14H5zM8 9h8M8 13h5') },
  { id: 'rect', label: 'Rectangle', sc: 'R', icon: svg('M4 5h16v14H4z') },
  { id: 'ellipse', label: 'Ellipse', sc: 'O·2', icon: svg('M12 5a8 7 0 100 14 8 7 0 000-14z') },
  { id: 'arrow', label: 'Arrow', sc: 'A', icon: svg('M5 19L19 5M19 5h-8m8 0v8') },
  { id: 'line', label: 'Line', sc: 'L', icon: svg('M5 19L19 5') },
  { id: 'pen', label: 'Freehand pen', sc: 'B', icon: svg('M4 20c6-1 4-7 8-11 2.5-2.5 5-3 8-5-1 3-1.5 5.5-4 8-4 4-9 3-12 8z') },
  { id: 'highlighter', label: 'Highlighter', sc: '', icon: svg('M4 17h16M6 16l9-9 3 3-9 9H6z') },
  { id: 'blur', label: 'Blur / redact', sc: 'X', icon: svg('M4 5h16v14H4zM8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01') },
  { id: 'spotlight', label: 'Spotlight region', sc: 'S', icon: svg('M12 8a4 4 0 100 8 4 4 0 000-8zM3 12h3m12 0h3M12 3v3m0 12v3') },
  { id: 'magnify', label: 'Zoom cutout', sc: 'M', icon: svg('M10.5 4a6.5 6.5 0 104.2 11.5L20 21M10.5 7.5v6M7.5 10.5h6') },
  { id: 'qr', label: 'QR code', sc: 'Q', icon: svg('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2m2 0h2m-4 3h2m2 0h2v3h-2') },
  { id: 'icon', label: 'Icon library', sc: 'I', icon: svg('M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z') },
  { id: 'emoji', label: 'Emoji', sc: 'E', icon: svg('M12 3a9 9 0 100 18 9 9 0 000-18zM9 10h.01M15 10h.01M8.5 14.5a4.5 4.5 0 007 0') },
  { id: '@mockup', label: 'Device mockup', sc: 'D', icon: svg('M4 5h16v11H4zM2 19h20M9 19v-3h6v3') },
];

export function ToolRail() {
  useChibuike();
  const [iconPop, setIconPop] = useState(false);
  const [mockPop, setMockPop] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const isActive = (t: ToolDef) => {
    if (t.id === '@crop') return store.cropActive;
    if (t.id === '@mockup') return false;
    return store.tool === t.id;
  };
  const fire = (t: ToolDef) => {
    if (t.id === '@crop') { store.startCrop(); return; }
    if (t.id === '@image') { imgRef.current?.click(); return; }
    if (t.id === '@mockup') { setMockPop(v => !v); return; }
    if (t.id === 'icon') { setIconPop(v => !v); store.setTool('icon'); return; }
    store.setTool(t.id as ChibuikeTool);
  };

  const addMockup = (device: 'browser' | 'browser-dark' | 'mac' | 'phone' | 'laptop') => {
    const d = store.doc;
    const w = device === 'phone' ? d.width * 0.32 : d.width * 0.6;
    const h = device === 'phone' ? w * 2.05 : w * 0.62;
    void (async () => {
      const { chibuikeMakeMockup } = await import('../../chibuike/chibuikeFactories');
      const m = chibuikeMakeMockup((d.width - w) / 2, (d.height - h) / 2, w, h, device);
      store.addObjects([m], 'Add mockup');
    })();
    setMockPop(false);
  };

  return (
    <div className="pf-rail" data-tut="rail">
      {CHIBUIKE_TOOLS.slice(0, 3).map(t => <RailBtn key={t.id} t={t} active={isActive(t)} onClick={() => fire(t)} />)}
      <div className="pf-rail-gap" />
      {CHIBUIKE_TOOLS.slice(3, 8).map(t => <RailBtn key={t.id} t={t} active={isActive(t)} onClick={() => fire(t)} />)}
      <div className="pf-rail-gap" />
      {CHIBUIKE_TOOLS.slice(8, 16).map(t => <RailBtn key={t.id} t={t} active={isActive(t)} onClick={() => fire(t)} />)}
      <div className="pf-rail-gap" />
      {CHIBUIKE_TOOLS.slice(16).map(t => <RailBtn key={t.id} t={t} active={isActive(t)} onClick={() => fire(t)} />)}
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={e => {
        const f = e.target.files?.[0];
        if (f) void (async () => {
          const id = await store.ingestImage(f, f.name);
          const entry = chibuikeAssets.get(id)!;
          const d = store.doc;
          const s = Math.min((d.width * 0.7) / entry.w, (d.height * 0.7) / entry.h, 1);
          const o = chibuikeMakeImage(id, (d.width - entry.w * s) / 2, (d.height - entry.h * s) / 2, entry.w * s, entry.h * s);
          store.addObjects([o], 'Add image');
        })();
      }} />
      {mockPop && (
        <div className="pf-pop" style={{ left: 58, bottom: 40 }} onClick={() => setMockPop(false)}>
          <h4>Drop image into device</h4>
          {(['browser', 'browser-dark', 'mac', 'laptop', 'phone'] as const).map(dev => (
            <button key={dev} className="pf-menu-item" onClick={() => addMockup(dev)}>
              {dev === 'phone' ? '📱' : dev === 'laptop' ? '💻' : dev === 'mac' ? '🖥' : '🌐'} {dev[0].toUpperCase() + dev.slice(1)}
            </button>
          ))}
          <div className="pf-tiny pf-muted" style={{ padding: '4px 8px' }}>Add a mockup, then drop an image file onto its screen.</div>
        </div>
      )}
      {iconPop && <IconPicker onClose={() => setIconPop(false)} />}
    </div>
  );
}

function RailBtn({ t, active, onClick }: { t: ToolDef; active: boolean; onClick: () => void }) {
  return (
    <button className={`pf-rail-btn pf-tip${active ? ' on' : ''}`} data-tip={`${t.label}${t.sc ? ' · ' + t.sc : ''}`} aria-label={t.label} onClick={onClick}>
      {t.icon}
    </button>
  );
}

function IconPicker({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [defs, setDefs] = useState<{ name: string; path: string; tags: string }[]>([]);
  useEffect(() => {
    void import('../../chibuike/chibuikeIcons').then(m => setDefs(m.chibuikeSearchIcons(q)));
  }, [q]);
  return (
    <div className="pf-pop" style={{ left: 58, top: 8, width: 264, maxHeight: 420, overflow: 'auto' }} onClick={e => e.stopPropagation()}>
      <input autoFocus type="text" placeholder="Search icons…" value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', marginBottom: 8 }} onKeyDown={e => e.stopPropagation()} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {defs.map(d => (
          <button
            key={d.name} title={d.name}
            style={{ aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pf-text)' }}
            className="pf-menu-item"
            onClick={() => {
              (window as unknown as { __chibuikeIconPath?: string }).__chibuikeIconPath = d.path;
              store.setTool('icon');
              onClose();
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24"><path d={d.path} fill="currentColor" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
