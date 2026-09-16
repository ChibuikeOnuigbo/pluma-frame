// Chibuike top bar — home, doc name, undo/redo, zoom, mode, save/export, help.
import { useEffect, useRef, useState } from 'react';
import { store, useChibuike } from '../../chibuike/chibuikeStore';
import { chibuikeDownloadProject, chibuikeAutosaveNow } from '../../chibuike/chibuikeProject';
import { chibuikeCopyToClipboard, chibuikeDownload, chibuikeEncode } from '../../chibuike/chibuikeExport';

const I = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m0 0l6 6m-6-6l6-6" /></svg>,
  undo: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 016 6v1" /></svg>,
  redo: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 00-6 6v1" /></svg>,
  save: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>,
  export: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 20h14" /></svg>,
  help: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 114 2c-.8.7-1.5 1.2-1.5 2.3M12 17h.01" /></svg>,
};

export function Topbar({ onIngest }: { onIngest: (f: File) => void }) {
  useChibuike();
  const fileRef = useRef<HTMLInputElement>(null);
  const [zoomPop, setZoomPop] = useState(false);
  const zoom = store.viewport.zoom;
  const doc = store.doc;

  useEffect(() => {
    const close = () => setZoomPop(false);
    if (zoomPop) { setTimeout(() => addEventListener('click', close, { once: true }), 0); }
  }, [zoomPop]);

  return (
    <div className="pf-topbar" data-tut="topbar">
      <a className="pf-icon-btn" href="#/" title="Back to home" aria-label="Back to home">{I.back}</a>
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
        {store.dirty && <span className="pf-tiny pf-muted" title="Unsaved changes (autosaved locally)">●</span>}
      </div>
      <button className="pf-icon-btn" title="Save project locally (Ctrl S)" onClick={() => { void chibuikeAutosaveNow(doc).then(() => { store.lastSavedAt = Date.now(); store.toast('Saved', 'ok'); store.bumpReact(); }); }}>{I.save}</button>
      <button
        className="pf-icon-btn" title="Download .pluma.json project file"
        onClick={() => { void chibuikeDownloadProject(doc).then(() => store.toast('Project file downloaded', 'ok')); }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" /></svg>
      </button>
      <button className="pf-icon-btn" title="Open project file" onClick={() => fileRef.current?.click()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 012-2h5l2 3h7a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" /></svg>
      </button>
      <input ref={fileRef} type="file" accept=".pluma.json,application/json" hidden onChange={e => {
        const f = e.target.files?.[0];
        if (!f) return;
        void f.text().then(t => chibuikeLoadProjectFileText(t)).catch(err => store.toast(String(err), 'error'));
      }} />
      <div className="pf-sep" />
      <button className="pf-icon-btn" title="Undo (Ctrl Z)" disabled={!store.history.canUndo()} onClick={() => { store.history.undo(); store.bumpReact(); }}>{I.undo}</button>
      <button className="pf-icon-btn" title="Redo (Ctrl Shift Z)" disabled={!store.history.canRedo()} onClick={() => { store.history.redo(); store.bumpReact(); }}>{I.redo}</button>
      <div className="pf-sep" />
      <div className="pf-zoom-pill">
        <button className="pf-icon-btn" style={{ width: 22, height: 24 }} title="Zoom out" onClick={() => store.zoomBy(1 / 1.2)}>−</button>
        <button style={{ width: 46, height: 24, fontSize: 11.5, color: 'var(--pf-text)' }} title="Zoom presets" onClick={e => { e.stopPropagation(); setZoomPop(v => !v); }}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="pf-icon-btn" style={{ width: 22, height: 24 }} title="Zoom in" onClick={() => store.zoomBy(1.2)}>+</button>
        <button style={{ height: 24, fontSize: 11, padding: '0 6px', color: 'var(--pf-text-2)' }} title="Fit to screen (0)" onClick={() => store.fit()}>Fit</button>
      </div>
      {zoomPop && (
        <div className="pf-pop" style={{ top: 42, left: 220 }} onClick={e => e.stopPropagation()}>
          {[
            ['Fit', () => store.fit()], ['100%', () => store.zoomTo(1)],
            ['25%', () => store.zoomTo(0.25)], ['50%', () => store.zoomTo(0.5)],
            ['75%', () => store.zoomTo(0.75)], ['200%', () => store.zoomTo(2)],
            ['400%', () => store.zoomTo(4)], ['800%', () => store.zoomTo(8)],
          ].map(([label, fn]) => (
            <button key={label as string} className="pf-menu-item" onClick={() => { (fn as () => void)(); setZoomPop(false); }}>{label as string}</button>
          ))}
        </div>
      )}
      <div className="spacer" />
      <span className="pf-tiny pf-muted" title={store.online ? 'Online — optional external imports available' : 'Offline — core editing unaffected'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: 9, background: store.online ? 'var(--pf-green)' : 'var(--pf-amber)', display: 'inline-block' }} />
        {store.online ? '' : 'offline'}
      </span>
      <div className="pf-sep" />
      <button
        className="pf-icon-btn" data-tut="mode"
        title={store.uiMode === 'simple' ? 'Switch to Studio mode — full editor' : 'Switch to Simple mode'}
        onClick={() => store.setMode(store.uiMode === 'simple' ? 'studio' : 'simple')}
      >
        {store.uiMode === 'simple'
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 17l6-6-6-6M12 19h8" /></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>}
      </button>
      <button className="pf-icon-btn" title="Copy image to clipboard" onClick={async () => {
        try { await chibuikeCopyToClipboard(doc, Math.min(doc.exportSettings.scale, 2)); store.toast('Image copied to clipboard', 'ok'); }
        catch (err) { store.toast('Clipboard blocked — use Export instead.', 'warn'); }
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
      </button>
      <button className="pf-btn small primary" data-tut="export" onClick={() => { store.modalOpen = 'export'; store.bumpReact(); }}>
        {I.export} Export
      </button>
      <button className="pf-icon-btn" title="Help & shortcuts" onClick={() => { store.modalOpen = 'shortcuts'; store.bumpReact(); }}>{I.help}</button>
    </div>
  );
}

async function chibuikeLoadProjectFileText(t: string) {
  const { chibuikeLoadProjectFile } = await import('../../chibuike/chibuikeProject');
  const doc = await chibuikeLoadProjectFile(t);
  store.loadDoc(doc, 'Project loaded');
  store.fit();
}
