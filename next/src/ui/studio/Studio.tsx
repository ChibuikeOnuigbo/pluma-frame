/**
 * Chibuike Studio shell — owns the canvas element, the render loop and the
 * keyboard plane. Panels are pure readers of the store; the canvas never
 * re-renders React (drags bump store.rev only). Error boundary keeps one bad
 * panel from killing the route.
 */
import { Component, ReactNode, useEffect, useRef, useState } from 'react';
import { store, useChibuike } from '../../chibuike/chibuikeStore';
import { ChibuikePointerController } from '../../chibuike/chibuikeTools';
import { chibuikePaintEditor } from '../../chibuike/chibuikeEditor';
import { chibuikeAssets } from '../../chibuike/chibuikeAssets';
import { chibuikeScheduleAutosave, chibuikeAutosaveNow, chibuikeReadAutosave, chibuikeDownloadProject, chibuikeLoadProjectFile } from '../../chibuike/chibuikeProject';
import { chibuikeNewDoc, chibuikeFindObject } from '../../chibuike/chibuikeDoc';
import type { ChibuikeDoc } from '../../chibuike/chibuikeTypes';
import { Topbar } from './Topbar';
import { ToolRail } from './ToolRail';
import { Inspector } from './Inspector';
import { SimpleOverlay } from './SimpleOverlay';
import { Timeline } from './Timeline';
import { ChibuikeModals } from './Modals';
import { ChibuikeToasts } from './Toasts';
import { Coach, chibuikeTutorialDone } from './Coach';
import { chibuikeLoadShortcuts } from '../../chibuike/chibuikeStore';

/* ── error boundary ─────────────────────────────────────────────────────── */
class PanelBoundary extends Component<{ children: ReactNode; name: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="pf-error-panel" style={{ margin: 12 }}>
          <b>{this.props.name}</b> hit a snag: {this.state.err.message}
          <button className="pf-chip" style={{ marginLeft: 8 }} onClick={() => this.setState({ err: null })}>Retry panel</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── text editor overlay ────────────────────────────────────────────────── */
function ChibuikeTextEditor() {
  const rev = useChibuike();
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = store.editingTextId;
  const o = id ? chibuikeFindObject(store.doc, id) : null;
  useEffect(() => {
    if (o && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!o || o.kind !== 'text') return null;
  const p = store.docToScreen(o.x, o.y);
  const st = store.doc;
  const zoom = store.viewport.zoom;
  const value = o.text;
  return (
    <textarea
      ref={ref}
      key={o.id + String(rev).slice(0, -3)}
      defaultValue={value}
      style={{
        position: 'absolute', left: p.x, top: p.y - 4,
        width: Math.max(o.w * zoom, 80) + 40, height: Math.max(o.h * zoom + 16, 34),
        background: 'rgba(13,15,20,0.94)', border: '1px solid var(--pf-accent)', borderRadius: 8,
        color: o.color, fontSize: o.size * zoom, fontWeight: o.weight, lineHeight: o.lineHeight,
        zIndex: 50, resize: 'none', outline: 'none', padding: 4, letterSpacing: o.letterSpacing * zoom,
      }}
      onChange={e => {
        store.setProp(o.id, { text: e.target.value }, 'Edit text');
        requestAnimationFrame(() => store.bumpRev());
      }}
      onBlur={() => { store.editingTextId = null; store.bumpReact(); }}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Escape') { store.editingTextId = null; store.bumpReact(); }
      }}
    />
  );
}

/* ── the studio ─────────────────────────────────────────────────────────── */
export default function Studio() {
  const rev = useChibuike();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ChibuikePointerController | null>(null);
  const [hud, setHud] = useState('');
  const [coach, setCoach] = useState(false);
  const [recovered, setRecovered] = useState<ChibuikeDoc | null>(null);

  // Chibuike QA hook — lets browser tests drive/inspect the real engine.
  useEffect(() => {
    (window as unknown as { __plumaStore?: unknown }).__plumaStore = store;
    return () => { delete (window as unknown as { __plumaStore?: unknown }).__plumaStore; };
  }, []);

  /* canvas sizing + dpr cap */
  useEffect(() => {
    const cv = canvasRef.current!;
    const stage = stageRef.current!;
    let w = 0, h = 0;
    const ro = new ResizeObserver(() => {
      const r = stage.getBoundingClientRect();
      if (r.width === w && r.height === h) return;
      w = r.width; h = r.height;
      store.canvasSize = { w, h };
      const dpr = Math.min(devicePixelRatio || 1, store.perf.dprCap);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      store.bumpRev();
      if (!store.userFitted) { store.userFitted = true; store.fit(); }
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  /* render loop — repaint only when the engine rev moves or animation plays */
  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d', { alpha: false })!;
    let raf = 0;
    let lastRev = -1;
    let fps = 0, frames = 0, fpsT = performance.now(), renderMs = 0;
    const loop = (t: number) => {
      const playing = store.playing;
      if (playing) {
        const dt = Math.min(0.05, (t - (loop as unknown as { last?: number }).last!) / 1000) || 0.016;
        (loop as unknown as { last?: number }).last = t;
        store.playhead += dt;
        if (store.playhead > store.animDuration) store.playhead = 0;
        store.bumpRev();
      } else {
        (loop as unknown as { last?: number }).last = t;
      }
      if (store.rev !== lastRev || playing) {
        lastRev = store.rev;
        const t0 = performance.now();
        const dpr = cv.width / Math.max(1, store.canvasSize.w);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        chibuikePaintEditor(ctx, store.doc, { dpr, hoverId: controllerRef.current?.hoverIdPublic ?? null, time: store.playhead });
        renderMs = renderMs * 0.9 + (performance.now() - t0) * 0.1;
        frames++;
        if (t - fpsT > 500) {
          fps = Math.round(frames * 1000 / (t - fpsT));
          frames = 0; fpsT = t;
          (window as unknown as { __plumaPerf?: unknown }).__plumaPerf = { fps, renderMs, zoom: store.viewport.zoom };
          if (store.perf.hud) {
            setHud(`fps ${fps}\nrender ${renderMs.toFixed(1)}ms\nobjects ${store.doc.objects.length}\nzoom ${(store.viewport.zoom * 100).toFixed(0)}%\nassets ${(chibuikeAssets.totalBytes() / 1048576).toFixed(1)}MB`);
          }
        }
        // autosave (debounced inside)
        if (store.dirty) { store.dirty = false; chibuikeScheduleAutosave(store.doc); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* pointer controller */
  useEffect(() => {
    const c = new ChibuikePointerController(canvasRef.current!);
    controllerRef.current = c;
    return () => c.detach();
  }, []);

  /* recovery prompt */
  useEffect(() => {
    void chibuikeReadAutosave().then(rec => {
      if (rec?.file?.doc?.objects?.length) setRecovered(rec.file.doc);
    });
  }, []);

  /* pending file from landing */
  useEffect(() => {
    const f = (window as unknown as { __chibuikePendingFile?: File }).__chibuikePendingFile;
    if (f) {
      (window as unknown as { __chibuikePendingFile?: File }).__chibuikePendingFile = undefined;
      void chibuikeIngestFile(f);
    } else {
      store.fit();
    }
    if (!chibuikeTutorialDone()) setCoach(true);
  }, []);

  /* keyboard plane — respects typing targets and open modals */
  useEffect(() => {
    const shortcuts = chibuikeLoadShortcuts();
    const key = (action: string | undefined, fallback: string) => (action ? shortcuts[action] ?? fallback : fallback);
    const onKey = (e: KeyboardEvent) => {
      if (store.isTypingTarget(e.target)) return;
      if (store.modalOpen) return; // modal owns keys (its own handler)
      const mod = e.metaKey || e.ctrlKey;
      const withMod = (k: string, action: string) => {
        const kk = key(action, k);
        if (kk === 'mod+z') return mod && !e.shiftKey && e.key.toLowerCase() === 'z';
        if (kk === 'mod+shift+z') return mod && e.shiftKey && e.key.toLowerCase() === 'z';
        if (kk === 'mod+s') return mod && e.key.toLowerCase() === 's';
        if (kk === 'mod+e') return mod && e.key.toLowerCase() === 'e';
        return false;
      };
      if (withMod('mod+z', 'undo')) { e.preventDefault(); store.history.undo(); store.bumpReact(); return; }
      if (withMod('mod+shift+z', 'redo')) { e.preventDefault(); store.history.redo(); store.bumpReact(); return; }
      if (withMod('mod+s', 'save')) { e.preventDefault(); void chibuikeAutosaveNow(store.doc).then(() => { store.lastSavedAt = Date.now(); store.toast('Project saved locally', 'ok'); store.bumpReact(); }); return; }
      if (withMod('mod+e', 'export')) { e.preventDefault(); store.modalOpen = 'export'; store.bumpReact(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); store.duplicateSelection(); return; }
      if (mod && e.key.toLowerCase() === 'g' && !e.shiftKey) { e.preventDefault(); store.groupSelection(); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'g') { e.preventDefault(); store.ungroupSelection(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); store.selectAll(); return; }
      if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); store.modalOpen = 'palette'; store.bumpReact(); return; }
      if (mod && e.key.toLowerCase() === 'c') { store.copySelection(); return; }
      if (mod && e.key.toLowerCase() === 'v') { store.paste(); return; }
      if (mod && e.key.toLowerCase() === 'x') { store.copySelection(); store.deleteSelection(); return; }
      switch (e.key) {
        case 'Delete': case 'Backspace': e.preventDefault(); store.deleteSelection(); return;
        case 'Escape': store.clearSelection(); store.cancelCrop(); if (store.uiMode === 'studio') store.setTool('select'); return;
        case 'ArrowLeft': e.preventDefault(); store.nudge(-1, 0, e.shiftKey); return;
        case 'ArrowRight': e.preventDefault(); store.nudge(1, 0, e.shiftKey); return;
        case 'ArrowUp': e.preventDefault(); store.nudge(0, -1, e.shiftKey); return;
        case 'ArrowDown': e.preventDefault(); store.nudge(0, 1, e.shiftKey); return;
        case 'Enter': {
          const [o] = store.selected();
          if (o?.kind === 'text') { store.editingTextId = o.id; store.bumpReact(); }
          return;
        }
        case '[': store.reorder('backward'); return;
        case ']': store.reorder('forward'); return;
        case '0': store.fit(); return;
        case '1': store.zoomTo(1); return;
      }
      const k = e.key.toLowerCase();
      if (e.code === 'Space') { e.preventDefault(); store.playing ? store.stop() : store.play(); return; }
      if (mod || e.altKey) return;
      const toolKeys: Record<string, string> = {
        [key('toolSelect', 'v')]: 'select', [key('toolHand', 'h')]: 'hand',
        [key('toolText', 't')]: 'text', [key('toolRect', 'r')]: 'rect',
        [key('toolArrow', 'a')]: 'arrow', [key('toolBrush', 'b')]: 'pen',
        [key('toolCrop', 'c')]: '@crop', [key('toolBlur', 'x')]: 'blur',
        [key('toolSpot', 'o')]: 'spotlight', [key('toolNumber', 'n')]: 'number',
        [key('toolCallout', 'u')]: 'callout', [key('toolEllipse', 'e2')]: 'ellipse',
      };
      if (k in toolKeys) {
        e.preventDefault();
        const t = toolKeys[k];
        if (t === '@crop') store.startCrop();
        else store.setTool(t as never);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* paste image / project anywhere */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (store.isTypingTarget(e.target)) return;
      const item = [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
      if (item) {
        const f = item.getAsFile();
        if (f) { e.preventDefault(); void chibuikeIngestFile(f); return; }
      }
      const text = e.clipboardData?.getData('text/plain');
      if (text && text.trim().startsWith('{') && text.includes('pluma-frame-next')) {
        try {
          const doc = await chibuikeLoadProjectFile(text);
          store.loadDoc(doc, 'Project pasted');
        } catch (err) { store.toast(String(err), 'error'); }
      }
    };
    window.addEventListener('paste', onPaste as unknown as EventListener);
    return () => window.removeEventListener('paste', onPaste as unknown as EventListener);
  }, []);

  const showTimeline = store.uiMode === 'studio';

  return (
    <div className="pf-app pf-studio" data-tut="studio">
      <PanelBoundary name="Top bar">
        <Topbar onIngest={chibuikeIngestFile} />
      </PanelBoundary>
      <div className="pf-main">
        <PanelBoundary name="Tool rail">
          <ToolRail />
        </PanelBoundary>
        <div className="pf-stage-col">
          <div
            className="pf-stage"
            ref={stageRef}
            data-tut="canvas"
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f && f.type.startsWith('image/')) void chibuikeIngestFile(f);
              else if (f && f.name.endsWith('.pluma.json')) {
                void f.text().then(t => chibuikeLoadProjectFile(t)).then(d => store.loadDoc(d, 'Project loaded')).catch(err => store.toast(String(err), 'error'));
              }
            }}
          >
            <canvas ref={canvasRef} aria-label="Editor canvas" />
            {store.uiMode === 'simple' && <SimpleOverlay onIngest={chibuikeIngestFile} />}
            {store.uiMode === 'studio' && store.doc.objects.length === 0 && (
              <div className="pf-upload-hero">
                <label className="big" style={{ cursor: 'pointer' }}>
                  <div><b>Drop a screenshot here</b></div>
                  <span className="pf-muted pf-tiny">or paste from clipboard · click to browse</span>
                  <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void chibuikeIngestFile(f); }} />
                </label>
              </div>
            )}
            <ChibuikeTextEditor />
            {store.perf.hud && <div className="pf-hud">{hud}</div>}
          </div>
          {showTimeline && (
            <PanelBoundary name="Timeline">
              <Timeline />
            </PanelBoundary>
          )}
        </div>
        <PanelBoundary name="Inspector">
          <Inspector />
        </PanelBoundary>
      </div>
      <ChibuikeModals />
      <ChibuikeToasts />
      {coach && <Coach onDone={() => setCoach(false)} />}
      {recovered && (
        <div className="pf-modal-veil" style={{ zIndex: 400 }}>
          <div className="pf-modal" style={{ maxWidth: 420 }}>
            <div className="pf-modal-head"><h3>Recover your last session?</h3></div>
            <div className="pf-modal-body pf-muted">
              An autosave from <b>{new Date(recovered.meta.updatedAt).toLocaleString()}</b> was found
              ({recovered.objects.length} objects, “{recovered.name}”).
            </div>
            <div className="pf-modal-foot">
              <button className="pf-btn small" onClick={() => { void chibuikeClearAutosaveSafe(); setRecovered(null); }}>Discard</button>
              <button className="pf-btn small primary" onClick={async () => {
                const doc = await chibuikeLoadProjectFile(JSON.stringify({ chibuike: 'pluma-frame-next', plumaProjectVersion: 1, doc: recovered }));
                store.loadDoc(doc, 'Session recovered');
                store.fit();
                setRecovered(null);
              }}>Recover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function chibuikeClearAutosaveSafe() {
  const { chibuikeClearAutosave } = await import('../../chibuike/chibuikeProject');
  void chibuikeClearAutosave();
}

/** shared ingest: image file → asset → placed on canvas */
export async function chibuikeIngestFile(f: File): Promise<void> {
  try {
    const id = await store.ingestImage(f, f.name);
    store.placeImage(id);
    store.toast(`Added ${f.name}`, 'ok');
  } catch (err) {
    store.toast(`Could not read ${f.name}: ${String(err)}`, 'error');
  }
}
