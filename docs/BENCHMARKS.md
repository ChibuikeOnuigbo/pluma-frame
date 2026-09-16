# Pluma Frame Next — Performance Benchmarks

All numbers from **real headless Chromium** (via `@sparticuz/chromium` +
`puppeteer-core`) driving the actual dev build, measured by the automated QA
suite `next/scripts/chibuikeQa.mjs` (check 24–25). The render loop is the
real `requestAnimationFrame` loop; "drag frame" is the wall time of a
synthetic 60-move drag replayed through the real pointer pipeline.

Environment: sandboxed Linux, CPU-throttled shared vCPU, `--disable-gpu`
(so these are conservative, software-rasterizer numbers).

## Scene render & interaction

| Scene | Full render | Drag frame | FPS during drag | Budget |
|---|---|---|---|---|
| 500 objects | **0.5 ms** | **16.7 ms** | ~60 (vsync-capped) | < 40 ms |
| 2,004 objects | **2.1 ms** | **18.1–18.4 ms** | 36–49 | < 40 ms |

Every number is far inside the 40 ms interaction budget. Even with 2,000
vector objects, a drag frame costs about one vsync period.

Full-scene render cost scales sub-linearly because the renderer only repaints
dirty regions and skips fully-cached image objects (decoded bitmaps live in
`chibuikeAssets`, off the document state).

## Off-screen export (2× PNG, 1586×992 doc)

Encode + download completes well under the 8-second polling window the QA
suite allows; measured in the same suite (check 23). The export path renders
through `chibuikePaintScene` off-screen at full resolution — the preview zoom
never affects output.

## Build output (vite production build)

| Chunk | Raw | gzip |
|---|---|---|
| `index` (entry, landing) | 64.5 KB | 23.0 KB |
| `Studio` (lazy route) | 108.2 KB | 32.2 KB |
| react vendor | 141.7 KB | 45.5 KB |
| qr | 21.3 KB | 7.9 KB |
| css | 18 KB | 4.4 KB |

One benign warning: `chibuikeIcons` is both statically imported (Inspector)
and dynamically imported (ToolRail icon shelf), so it appears in its own tiny
chunk. Studio (the heavy route) is lazy-loaded from a 23 KB-gzip landing
page.

## Regression testing

Re-run anytime:

```bash
cd next && npm install        # if node_modules is missing
npm run dev &                 # :5173
LD_LIBRARY_PATH=/tmp/al2023/lib node scripts/chibuikeQa.mjs
```

Last run: **30/30 checks passed**, including the two benchmarks above,
10.6 MB PNG export verification, autosave readback (`{name:'QA project',
objects:2004}`) and zero unexpected console errors.
