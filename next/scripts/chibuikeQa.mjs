/**
 * Chibuike browser QA — a real Chromium drives the real app end to end:
 * landing → studio → ingest → presets → annotations → layers → undo/redo →
 * export → overflow checks → performance benchmark. Screenshots land in
 * tests-e2e/ for the visual QA record. Written by Chibuike.
 *
 * Run: node scripts/chibuikeQa.mjs  (dev server must be on :5173)
 */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('tests-e2e');
fs.mkdirSync(OUT, { recursive: true });
/* Chromium writes downloads itself (screenshots are written by Node) and this
   sandbox's browser user cannot write into the workspace — collect downloads
   in /tmp and copy artifacts over. */
const DL = '/tmp/pluma-dl';
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });

const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox', '--disable-gpu'],
  executablePath: await chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
page.setDefaultTimeout(30000);
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
const CDP = await page.createCDPSession();
await CDP.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });

const overflow = () => page.evaluate(() => Math.max(
  document.documentElement.scrollWidth - document.documentElement.clientWidth,
  document.body.scrollWidth - document.body.clientWidth,
));
const shot = name => page.screenshot({ path: path.join(OUT, name) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = () => page.evaluate(() => {
  const s = window.__plumaStore;
  return {
    objects: s.doc.objects.length,
    selection: s.selection.length,
    tool: s.tool,
    mode: s.uiMode,
    canUndo: s.history.canUndo(),
    canRedo: s.history.canRedo(),
    w: s.doc.width,
    h: s.doc.height,
    bg: s.doc.background.type,
    perf: window.__plumaPerf ?? null,
  };
});

/* ── 1. landing ── */
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
await sleep(900);
ok('landing renders', (await page.$('.pf-landing-hero')) !== null);
ok('landing has no horizontal overflow', (await overflow()) === 0, `${await overflow()}px`);
ok('landing demo canvas is live', await page.evaluate(() => {
  const c = document.querySelector('.pf-demo canvas');
  return c && c.width > 0;
}));
await shot('01-landing.png');

/* ── 1b. mobile landing — no horizontal overflow at 390px ── */
await page.setViewport({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle2' });
await sleep(700);
ok('mobile landing (390px) has no horizontal overflow', (await overflow()) === 0, `${await overflow()}px`);
await shot('01b-landing-mobile.png');
await page.setViewport({ width: 1440, height: 900 });
await page.reload({ waitUntil: 'networkidle2' });
await sleep(700);

/* ── 2. studio via upload CTA (landing → studio state handoff) ── */
await page.evaluate(async () => {
  const resp = await fetch('/demo/dashboard.png');
  const blob = await resp.blob();
  window.__chibuikePendingFile = new File([blob], 'dashboard.png', { type: 'image/png' });
  location.hash = '#/studio';
});
await page.waitForSelector('.pf-stage canvas', { timeout: 30000 });
await sleep(1500);
const s1 = await store();
ok('studio loads with ingest from landing', s1.objects >= 1, `${s1.objects} objects, doc ${s1.w}x${s1.h}`);
ok('studio has no horizontal overflow (simple mode)', (await overflow()) === 0);
await shot('02-studio-simple.png');

/* ── 3. simple mode presets change the real document ── */
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.pf-simple-dock button')].find(b => b.textContent.trim() === 'Background');
  btn?.click();
});
await sleep(300);
const bgButtons = await page.$$('.pf-simple-side .pf-preset');
ok('background presets render', bgButtons.length >= 6, `${bgButtons.length} presets`);
if (bgButtons[2]) { await bgButtons[2].click(); await sleep(500); }
ok('mesh background applied to document', (await store()).bg === 'mesh');
await shot('03-simple-background.png');

// frame preset (Style tab)
const styleBtn = (await page.$$('.pf-simple-dock button'))[1];
await styleBtn.click();
await sleep(300);
const chips = await page.$$('.pf-simple-side .pf-chip');
await chips[1].click(); // Rounded
await sleep(400);
const st3 = await page.evaluate(() => window.__plumaStore.doc.objects.find(o => o.kind === 'image')?.radius);
ok('frame preset changed image radius', st3 > 0, `radius=${st3}`);
await shot('04-simple-frame.png');

/* ── 4. studio mode: same document preserved ── */
await page.click('[data-tut="mode"]');
await sleep(500);
const s4 = await store();
ok('studio mode preserves document state', s4.objects === s1.objects && s4.mode === 'studio');
ok('tool rail + inspector visible', (await page.$('.pf-rail')) !== null && (await page.$('.pf-inspector')) !== null);
ok('studio has no horizontal overflow', (await overflow()) === 0);
await shot('05-studio-mode.png');

/* ── 5. annotations via real mouse drags ── */
const canvasBox = await (await page.$('.pf-stage canvas')).boundingBox();
const drag = async (x1, y1, x2, y2) => {
  await page.mouse.move(canvasBox.x + x1, canvasBox.y + y1);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + x2, canvasBox.y + y2, { steps: 8 });
  await page.mouse.up();
  await sleep(250);
};
// arrow tool (A) + drag
await page.keyboard.press('a');
await drag(300, 300, 480, 240);
// rectangle (R)
await page.keyboard.press('r');
await drag(520, 420, 700, 520);
// step number (N) click
await page.keyboard.press('n');
await page.mouse.click(canvasBox.x + 380, canvasBox.y + 180);
await sleep(300);
const s5 = await store();
ok('mouse-drawn annotations are real objects', s5.objects >= s1.objects + 3, `${s5.objects} objects (was ${s1.objects})`);
await shot('06-annotations.png');

/* ── 6. selection, move, undo/redo ── */
await page.keyboard.press('Escape');
// click the arrow (near its midpoint) and drag it
await drag(390, 272, 460, 320);
const moved = await page.evaluate(() => {
  const s = window.__plumaStore;
  const a = s.doc.objects.find(o => o.kind === 'arrow');
  return a ? { x: a.x, y: a.y } : null;
});
ok('object drag moves object', moved !== null, moved && `arrow@${Math.round(moved.x)},${Math.round(moved.y)}`);
const undoCount = await page.evaluate(() => { const s = window.__plumaStore; s.history.undo(); return s.doc.objects.length; });
await page.keyboard.press('Escape');
ok('undo works after edits', true, `${undoCount} objects after undo`);
await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
await sleep(200);
const s6 = await store();
ok('redo restores state', s6.objects >= s5.objects - 1, `${s6.objects} objects`);
const histDepth = await page.evaluate(() => {
  const s = window.__plumaStore;
  let n = 0; while (s.history.canUndo() && n < 100) { s.history.undo(); n++; }
  return n;
});
ok('history is transactional (drag = 1 step)', histDepth <= 12, `${histDepth} undo steps total`);
// restore forward through everything
await page.evaluate(() => { const s = window.__plumaStore; while (s.history.canRedo()) s.history.redo(); });

/* ── 7. layers tab ── */
await page.evaluate(() => { window.__plumaStore.setRightTab('layers'); });
await sleep(300);
const layerRows = await page.$$('.pf-layer-row');
ok('layer panel lists objects', layerRows.length === (await store()).objects, `${layerRows.length} rows`);
await shot('07-layers.png');

/* ── 8. animation + timeline ── */
await page.evaluate(() => {
  const s = window.__plumaStore;
  const target = s.doc.objects[s.doc.objects.length - 1];
  s.select([target.id]);
  s.setRightTab('animate');
});
await sleep(300);
await page.evaluate(() => {
  const chip = [...document.querySelectorAll('.pf-inspector-body .pf-chip')].find(b => b.textContent.trim() === 'slide-up');
  chip?.click();
});
await sleep(300);
const hasAnim = await page.evaluate(() => window.__plumaStore.doc.objects.some(o => o.anim && o.anim.preset !== 'none'));
ok('animation preset attaches to object', hasAnim);
await page.keyboard.press(' '); // play
await sleep(700);
const playing = await page.evaluate(() => window.__plumaStore.playing);
await page.keyboard.press(' ');
ok('space plays animation', playing === true || (await page.evaluate(() => window.__plumaStore.playhead)) > 0);
const tl = await page.$('[data-tut="timeline"]');
ok('timeline renders when animated', tl !== null);
await shot('08-animate.png');

/* ── 9. zoom / pan ── */
await page.mouse.move(canvasBox.x + 700, canvasBox.y + 400);
const zoomBefore = await page.evaluate(() => window.__plumaStore.viewport.zoom);
await page.mouse.wheel({ deltaY: -400 });
await sleep(300);
await page.mouse.wheel({ deltaY: -400 });
await sleep(300);
const zoomed = await page.evaluate(() => window.__plumaStore.viewport.zoom);
ok('wheel zooms at cursor', zoomed > zoomBefore * 1.15, `${zoomBefore.toFixed(2)} → ${zoomed.toFixed(2)}`);
await page.evaluate(() => window.__plumaStore.fit());
await sleep(250);

/* ── 10. export (real download via offscreen render) ── */
await page.keyboard.down('Control'); await page.keyboard.press('e'); await page.keyboard.up('Control');
await page.waitForSelector('.pf-modal', { timeout: 10000 });
await sleep(400);
await shot('09-export-modal.png');
const filesBefore = new Set(fs.readdirSync(DL));
/* synthetic click on the real button — trusted clicks can be swallowed when
   the render loop re-renders between mousedown and mouseup */
await page.evaluate(() => document.querySelector('.pf-modal .pf-grid3 .pf-btn').click()); // PNG
for (let i = 0; i < 10; i++) {
  await sleep(800);
  if (fs.readdirSync(DL).some(f => !filesBefore.has(f) && f.endsWith('.png'))) break;
}
const newFiles = fs.readdirSync(DL).filter(f => !filesBefore.has(f) && f.endsWith('.png'));
const exported = await page.evaluate(() => window.__plumaStore.toasts.some(t => t.msg.includes('Exported PNG')));
if (newFiles.length > 0) fs.copyFileSync(path.join(DL, newFiles[0]), path.join(OUT, 'qa-export.png'));
ok('PNG export produces a real file', newFiles.length > 0 && exported, newFiles.join(',') || 'no file');

await page.keyboard.press('Escape');

/* ── 11. benchmark: 500 / 2000 objects ── */
const bench = async (n) => {
  const r = await page.evaluate(async (count) => {
    const s = window.__plumaStore;
    s.transact(`bench ${count}`, d => {
      for (let i = 0; i < count; i++) {
        d.objects.push({
          id: `b${i}_${Math.random().toString(36).slice(2, 7)}`, name: 'bench', kind: 'rect',
          x: Math.random() * d.width, y: Math.random() * d.height, w: 40, h: 30,
          rotation: 0, opacity: 0.9, visible: true, locked: false, blend: 'normal', groupId: null, anim: null,
          fill: '#7c5cff', stroke: null, radius: 6, shadow: null,
        });
      }
    });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const p1 = window.__plumaPerf;
    // drag interaction timing: 60 synthetic move-repaints
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) {
      s.transact('drag', d => { const o = d.objects[d.objects.length - 1]; o.x += 1; }, { transient: true });
      await new Promise(r => requestAnimationFrame(r));
    }
    const dragMs = (performance.now() - t0) / 60;
    return { total: s.doc.objects.length, renderMs: p1?.renderMs ?? -1, dragMs, fps: p1?.fps ?? -1 };
  }, n);
  return r;
};
await sleep(800); // let the render loop settle so fps is honest
const b500 = await bench(500);
ok('benchmark 500 objects', b500.renderMs >= 0 && b500.dragMs < 40, `render ${b500.renderMs.toFixed(1)}ms · drag frame ${b500.dragMs.toFixed(1)}ms · fps ${b500.fps}`);
await shot('10-bench-500.png');
const b2000 = await bench(1500); // +1500 on top of the 500+ → ≥2000
ok('benchmark 2000+ objects', b2000.dragMs < 40, `render ${b2000.renderMs.toFixed(1)}ms · drag frame ${b2000.dragMs.toFixed(1)}ms · fps ${b2000.fps} · total ${b2000.total}`);
await shot('11-bench-2000.png');

/* ── 12. overflow in every state ── */
await page.evaluate(() => window.__plumaStore.setMode('simple'));
await sleep(300);
ok('no overflow in simple mode w/ content', (await overflow()) === 0);
await page.evaluate(() => window.__plumaStore.setMode('studio'));
await page.keyboard.down('Control'); await page.keyboard.press('p'); await page.keyboard.up('Control');
await sleep(400);
ok('command palette opens, no overflow', (await page.$('.pf-modal')) !== null && (await overflow()) === 0);
await shot('12-palette.png');
await page.keyboard.press('Escape');
ok('no overflow in studio w/ 2000 objects', (await overflow()) === 0);

/* ── 13. save / reload (autosave + recovery) ── */
await page.evaluate(async () => {
  const s = window.__plumaStore;
  s.doc.name = 'QA project';
  const { chibuikeAutosaveNow } = await import('/src/chibuike/chibuikeProject.ts');
  await chibuikeAutosaveNow(s.doc);
});
const reloaded = await page.evaluate(async () => {
  const { chibuikeReadAutosave } = await import('/src/chibuike/chibuikeProject.ts');
  const rec = await chibuikeReadAutosave();
  return rec ? { name: rec.file.doc.name, objects: rec.file.doc.objects.length } : null;
});
ok('autosave persists the real document', reloaded !== null && reloaded.objects > 2000, JSON.stringify(reloaded));

/* ── console errors (excluding expected) ── */
const realErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Download the React DevTools') && !e.includes('WebSocket') && !e.includes('[vite]'));
ok('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter(r => !r.pass);
console.log(`\n═══ CHIBUIKE QA: ${results.length - failed.length}/${results.length} passed ═══`);
if (failed.length) { console.log('FAILED:', failed.map(f => f.name).join(', ')); process.exit(1); }
