// Chibuike top bar — home, name, history, zoom, mode, export. On narrow
// screens secondary actions collapse into a "More" menu instead of wrapping.
import { useEffect, useRef, useState } from 'react';
import { store, useChibuike } from '../../chibuike/chibuikeStore';
import { chibuikeDownloadProject, chibuikeAutosaveNow, chibuikeLoadProjectFile } from '../../chibuike/chibuikeProject';
import { chibuikeCopyToClipboard } from '../../chibuike/chibuikeExport';
import { Icon } from '../Icon';
import { ChibuikePopover, MenuItem, MenuDivider, useMediaQuery } from '../Overlay';

export function Topbar({ onIngest }: { onIngest: (f: File) => void }) {
  useChibuike();
  const narrow = useMediaQuery('(max-width: 1060px)');
  const [zoomPop, setZoomPop] = useState(false);
  const [morePop, setMorePop] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const zoomPillRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const zoom = store.viewport.zoom;
  const doc = store.doc;

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (zoomPillRef.current && !zoomPillRef.current.contains(e.target as Node)) setZoomPop(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMorePop(false);
    };
    if (zoomPop || morePop) window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [zoomPop, morePop]);

  useEffect(() => {
    const iv = setInterval(() => {
      const el = document.querySelector('.pf-inspector');
      setInspectorOpen(!!el && getComputedStyle(el).display !== 'none');
    }, 400);
    return () => clearInterval(iv);
  }, []);

  const save = () => void chibuikeAutosaveNow(doc).then(() => { store.lastSavedAt = Date.now(); store.toast('Saved locally', 'ok'); store.bumpReact(); });

  return (
    <div className="pf-topbar" data-tut="topbar">
      <a className="pf-icon-btn" href="#/" title="Home" aria-label="Back to home"><Icon name="home" size={16} /></a>
      <div className="pf-sep" />
      <div className="pf-topbar-title">
        <input
          className="pf-doc-name"
          data-tut="docname"
          value={doc.name}
          onChange={e => store.transact('Rename', d => { d.name = e.target.value; })}
          onKeyDown={e => e.stopPropagation()}
          spellCheck={false}
          aria-label="Document name"
        />
        {store.dirty && <span className="pf-dirty-dot" title="Unsaved changes (autosaved locally)" />}
      </div>

      {!narrow && (
        <>
          <button className="pf-icon-btn" title="Save locally" aria-label="Save" onClick={save}><Icon name="save" size={15} /></button>
          <button className="pf-icon-btn" title="Download project file" aria-label="Download project" onClick={() => void chibuikeDownloadProject(doc).then(() => store.toast('Project file downloaded', 'ok'))}><Icon name="download" size={15} /></button>
          <button className="pf-icon-btn" title="Open project file" aria-label="Open project" onClick={() => fileRef.current?.click()}><Icon name="folderOpen" size={15} /></button>
        </>
      )}
      <input ref={fileRef} type="file" accept=".pluma.json,application/json" hidden onChange={e => {
        const f = e.target.files?.[0];
        if (!f) return;
        void f.text().then(async t => {
          const loaded = await chibuikeLoadProjectFile(t);
          store.loadDoc(loaded, 'Project loaded');
          store.fit();
        }).catch(err => store.toast(String(err), 'error'));
      }} />

      <div className="pf-sep" />
      <button className="pf-icon-btn" title="Undo" aria-label="Undo" disabled={!store.history.canUndo()} onClick={() => { store.history.undo(); store.bumpReact(); }}><Icon name="undo" size={15} /></button>
      <button className="pf-icon-btn" title="Redo" aria-label="Redo" disabled={!store.history.canRedo()} onClick={() => { store.history.redo(); store.bumpReact(); }}><Icon name="redo" size={15} /></button>

      {!narrow && (
        <div className="pf-zoom-wrap" ref={zoomPillRef}>
          <div className="pf-zoom-pill">
            <button className="pf-icon-btn sm" title="Zoom out" aria-label="Zoom out" onClick={() => store.zoomBy(1 / 1.2)}><Icon name="minus" size={13} /></button>
            <button className="pf-zoom-val" title="Zoom presets" onClick={() => setZoomPop(v => !v)}>{Math.round(zoom * 100)}%</button>
            <button className="pf-icon-btn sm" title="Zoom in" aria-label="Zoom in" onClick={() => store.zoomBy(1.2)}><Icon name="plus" size={13} /></button>
            <button className="pf-zoom-fit" title="Fit to screen" onClick={() => store.fit()}>Fit</button>
          </div>
          <ChibuikePopover open={zoomPop} onClose={() => setZoomPop(false)} anchor="left" width={150}>
            {[
              ['Fit to screen', () => store.fit()], ['100%', () => store.zoomTo(1)],
              ['25%', () => store.zoomTo(0.25)], ['50%', () => store.zoomTo(0.5)],
              ['75%', () => store.zoomTo(0.75)], ['200%', () => store.zoomTo(2)],
              ['400%', () => store.zoomTo(4)], ['800%', () => store.zoomTo(8)],
            ].map(([label, fn]) => (
              <MenuItem key={label as string} onClick={() => { (fn as () => void)(); setZoomPop(false); }}>{label as string}</MenuItem>
            ))}
          </ChibuikePopover>
        </div>
      )}

      <div className="spacer" />

      <span className="pf-net" title={store.online ? 'Online: optional external imports available' : 'Offline: core editing unaffected'}>
        <span className={`pf-net-dot${store.online ? '' : ' off'}`} />
        {!store.online && <span className="pf-tiny">offline</span>}
      </span>

      <div className="pf-sep" />
      <button
        className="pf-icon-btn" data-tut="mode" title={store.uiMode === 'simple' ? 'Studio mode: full editor' : 'Simple mode'}
        onClick={() => store.setMode(store.uiMode === 'simple' ? 'studio' : 'simple')}
      >
        <Icon name={store.uiMode === 'simple' ? 'sliders' : 'wand'} size={15} />
      </button>
      {narrow && (
        <button className="pf-icon-btn" title="Layers & properties" aria-label="Toggle inspector" onClick={() => {
          const el = document.querySelector('.pf-inspector') as HTMLElement | null;
          if (el) el.classList.toggle('pf-inspector-open');
        }}><Icon name="panelRight" size={15} /></button>
      )}
      {!narrow && (
        <button className="pf-icon-btn" title="Copy image to clipboard" aria-label="Copy to clipboard" onClick={async () => {
          try { await chibuikeCopyToClipboard(doc, Math.min(doc.exportSettings.scale, 2)); store.toast('Image copied to clipboard', 'ok'); }
          catch { store.toast('Clipboard blocked. Use Export instead.', 'warn'); }
        }}><Icon name="clipboard" size={15} /></button>
      )}

      <button className="pf-btn small primary" data-tut="export" onClick={() => { store.modalOpen = 'export'; store.bumpReact(); }}>Export</button>

      <div className="pf-zoom-wrap" ref={moreRef}>
        <button className="pf-icon-btn" title="More" aria-label="More actions" onClick={() => setMorePop(v => !v)}><Icon name="more" size={16} /></button>
        <ChibuikePopover open={morePop} onClose={() => setMorePop(false)} anchor="right" width={220}>
          {narrow && (
            <>
              <MenuItem icon={<Icon name="zoomSearch" size={14} />} onClick={() => { store.zoomTo(1); setMorePop(false); }}>Zoom 100%</MenuItem>
              <MenuItem icon={<Icon name="focus" size={14} />} onClick={() => { store.fit(); setMorePop(false); }}>Fit to screen</MenuItem>
              <MenuDivider />
            </>
          )}
          {narrow && <MenuItem icon={<Icon name="save" size={14} />} onClick={() => { save(); setMorePop(false); }}>Save locally</MenuItem>}
          <MenuItem icon={<Icon name="download" size={14} />} onClick={() => { void chibuikeDownloadProject(doc); setMorePop(false); }}>Download project file</MenuItem>
          <MenuItem icon={<Icon name="folderOpen" size={14} />} onClick={() => { fileRef.current?.click(); setMorePop(false); }}>Open project file</MenuItem>
          <MenuItem icon={<Icon name="clipboard" size={14} />} onClick={async () => {
            try { await chibuikeCopyToClipboard(doc, Math.min(doc.exportSettings.scale, 2)); store.toast('Image copied to clipboard', 'ok'); }
            catch { store.toast('Clipboard blocked. Use Export instead.', 'warn'); }
            setMorePop(false);
          }}>Copy image to clipboard</MenuItem>
          <MenuItem icon={<Icon name={store.uiMode === 'simple' ? 'sliders' : 'wand'} size={14} />} onClick={() => { store.setMode(store.uiMode === 'simple' ? 'studio' : 'simple'); setMorePop(false); }}>
            {store.uiMode === 'simple' ? 'Studio mode' : 'Simple mode'}
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<Icon name="keyboard" size={14} />} hint="?" onClick={() => { store.modalOpen = 'shortcuts'; store.bumpReact(); setMorePop(false); }}>Shortcuts & help</MenuItem>
        </ChibuikePopover>
      </div>
    </div>
  );
}
