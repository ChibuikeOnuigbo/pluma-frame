// Chibuike tool rail — grouped tools, professional icons, tooltip + shortcut.
import { useEffect, useRef, useState } from 'react';
import { store, useChibuike, ChibuikeTool } from '../../chibuike/chibuikeStore';
import { chibuikeMakeImage, chibuikeMakeMockup } from '../../chibuike/chibuikeFactories';
import { chibuikeAssets } from '../../chibuike/chibuikeAssets';
import { Icon, ChibuikeIconName } from '../Icon';
import { ChibuikePopover, MenuItem, useDraggableBox } from '../Overlay';

interface ToolDef { id: ChibuikeTool | '@crop' | '@mockup' | '@image' | '@iconpick'; label: string; sc: string; icon: ChibuikeIconName; }

const CHIBUIKE_TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', sc: 'V', icon: 'cursor' },
  { id: 'hand', label: 'Pan', sc: 'H', icon: 'hand' },
  { id: '@crop', label: 'Crop', sc: 'C', icon: 'crop' },
  { id: '@image', label: 'Add image', sc: 'Paste or drop', icon: 'image' },
  { id: 'text', label: 'Text', sc: 'T', icon: 'type' },
  { id: 'callout', label: 'Callout', sc: 'U', icon: 'message' },
  { id: 'number', label: 'Step number', sc: 'N', icon: 'steps' },
  { id: 'badge', label: 'Store badge', sc: '', icon: 'badge' },
  { id: 'rect', label: 'Rectangle', sc: 'R', icon: 'square' },
  { id: 'ellipse', label: 'Ellipse', sc: '', icon: 'circle' },
  { id: 'arrow', label: 'Arrow', sc: 'A', icon: 'arrow' },
  { id: 'line', label: 'Line', sc: '', icon: 'line' },
  { id: 'pen', label: 'Pen', sc: 'B', icon: 'pen' },
  { id: 'highlighter', label: 'Highlighter', sc: '', icon: 'highlighter' },
  { id: 'blur', label: 'Blur and redact', sc: 'X', icon: 'pixels' },
  { id: 'spotlight', label: 'Spotlight', sc: '', icon: 'focus' },
  { id: 'magnify', label: 'Zoom cutout', sc: '', icon: 'zoomSearch' },
  { id: 'qr', label: 'QR code', sc: 'Q', icon: 'qr' },
  { id: 'icon', label: 'Icon library', sc: 'I', icon: 'star' },
  { id: 'emoji', label: 'Emoji', sc: 'E', icon: 'smile' },
  { id: '@mockup', label: 'Device mockup', sc: '', icon: 'monitor' },
];

export function ToolRail() {
  useChibuike();
  const [iconPop, setIconPop] = useState(false);
  const [mockPop, setMockPop] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const isActive = (t: ToolDef) => {
    if (t.id === '@crop') return store.cropActive;
    if (t.id === '@mockup') return mockPop;
    return store.tool === t.id;
  };
  const fire = (t: ToolDef) => {
    if (t.id === '@crop') { store.startCrop(); return; }
    if (t.id === '@image') { imgRef.current?.click(); return; }
    if (t.id === '@mockup') { setMockPop(v => !v); return; }
    if (t.id === 'icon') { setIconPop(v => !v); store.setTool('icon'); return; }
    store.setTool(t.id as ChibuikeTool);
  };

  const addMockup = (device: 'browser' | 'browser-dark' | 'mac' | 'laptop' | 'phone') => {
    const d = store.doc;
    const w = device === 'phone' ? d.width * 0.32 : d.width * 0.6;
    const h = device === 'phone' ? w * 2.05 : w * 0.62;
    const m = chibuikeMakeMockup((d.width - w) / 2, (d.height - h) / 2, w, h, device);
    store.addObjects([m], 'Add mockup');
    setMockPop(false);
  };

  const groups = [CHIBUIKE_TOOLS.slice(0, 3), CHIBUIKE_TOOLS.slice(3, 8), CHIBUIKE_TOOLS.slice(8, 16), CHIBUIKE_TOOLS.slice(16)];

  return (
    <div className="pf-rail" data-tut="rail">
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: 'contents' }}>
          {gi > 0 && <div className="pf-rail-gap" />}
          {g.map(t => (
            <button
              key={t.id}
              className={`pf-rail-btn pf-tip${isActive(t) ? ' on' : ''}`}
              data-tip={`${t.label}${t.sc ? ' · ' + t.sc : ''}`}
              aria-label={t.label}
              onClick={() => fire(t)}
            >
              <Icon name={t.icon} size={19} />
            </button>
          ))}
        </div>
      ))}
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
      <div className="pf-pop-anchor">
        <ChibuikePopover open={mockPop} onClose={() => setMockPop(false)} anchor="right" width={190}>
          <div className="pf-pop-title">Put an image inside</div>
          <MenuItem icon={<Icon name="globe" size={14} />} onClick={() => addMockup('browser')}>Browser</MenuItem>
          <MenuItem icon={<Icon name="globe" size={14} />} onClick={() => addMockup('browser-dark')}>Browser dark</MenuItem>
          <MenuItem icon={<Icon name="monitor" size={14} />} onClick={() => addMockup('mac')}>Desktop</MenuItem>
          <MenuItem icon={<Icon name="laptop" size={14} />} onClick={() => addMockup('laptop')}>Laptop</MenuItem>
          <MenuItem icon={<Icon name="phone" size={14} />} onClick={() => addMockup('phone')}>Phone</MenuItem>
          <div className="pf-menu-note">Then drop an image file onto the screen.</div>
        </ChibuikePopover>
      </div>
      {iconPop && <IconPicker onClose={() => setIconPop(false)} />}
    </div>
  );
}

function IconPicker({ onClose }: { onClose: () => void }) {
  const pickerDrag = useDraggableBox();
  const [q, setQ] = useState('');
  const [defs, setDefs] = useState<{ name: string; path: string; tags: string }[]>([]);
  useEffect(() => { void import('../../chibuike/chibuikeIcons').then(m => setDefs(m.chibuikeSearchIcons(q))); }, [q]);
  return (
    <div className="pf-pop" ref={pickerDrag.ref} onPointerDown={pickerDrag.onPointerDown} data-drag-handle title="Drag to move"
      style={pickerDrag.pos
        ? { position: 'fixed', left: pickerDrag.pos.x, top: pickerDrag.pos.y, width: 268, maxHeight: 420, overflow: 'auto', zIndex: 90 }
        : { position: 'fixed', left: 58, top: 64, width: 268, maxHeight: 420, overflow: 'auto', zIndex: 90, animation: 'pf-pop-in .13s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span className="pf-panel-grip" data-drag-handle title="Drag to move" style={{ position: 'static' }}><Icon name="grip" size={13} /></span>
        <Icon name="search" size={14} className="pf-muted" />
        <input autoFocus type="text" placeholder="Search icons" value={q}
          onChange={e => { setQ(e.target.value); void import('../../chibuike/chibuikeIcons').then(m => setDefs(m.chibuikeSearchIcons(e.target.value))); }}
          style={{ flex: 1 }} onKeyDown={e => e.stopPropagation()} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {defs.map(d => (
          <button key={d.name} title={d.name} className="pf-icon-tile"
            onClick={() => {
              (window as unknown as { __chibuikeIconPath?: string }).__chibuikeIconPath = d.path;
              store.setTool('icon');
              onClose();
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d={d.path} fill="currentColor" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
