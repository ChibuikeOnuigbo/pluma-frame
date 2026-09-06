# PlumaFrame

An open-source image mockup & screenshot presentation studio. Vite + React + TypeScript + Tailwind CSS.

## Stack

- **Vite + React (TS)** — build tooling & app shell
- **Tailwind CSS v4** — styling, via `@theme` design tokens in `src/index.css`
- **shadcn/ui-style primitives** (hand-rolled on Radix) — `src/components/ui/*`
- **GSAP** — animation preset engine (entrance + continuous attention effects)
- **lucide-react** — icons
- **zustand** — editor state
- **html2canvas** — PNG export

## Getting started

```bash
npm install
npm run dev       # start dev server
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build
```

## Architecture

```
src/
  types/editor.ts          # canvas / background / asset / animation types
  store/
    editorStore.ts         # single zustand store for the whole editor
    presets.ts              # canvas size presets, animate.css preset list, gradient palettes
  lib/
    utils.ts                # cn(), clamp(), uid()
    background.ts           # BackgroundConfig -> CSS (gradient/mesh/shadow builders)
    exportImage.ts          # html2canvas-based PNG export
  components/
    ui/                     # shadcn-style primitives (Button, Tabs, Slider, Switch, Select, ...)
    layout/
      Topbar.tsx             # app bar + export/reset actions
      Sidebar.tsx             # Tabs shell: Canvas / Asset / Effects
    canvas/
      CanvasStage.tsx         # the independent canvas engine (scaling, background, wrapper, asset)
      WindowChrome.tsx        # Mac / Windows / Browser chrome variants
      AssetUploader.tsx       # drag-drop / file-picker empty state
    panels/
      CanvasSettingsPanel.tsx    # dimensions, presets, gradients/mesh, blur, padding, shadow
      AssetStylingPanel.tsx      # independent width/height %, aspect lock, chrome style, radius/border
      EffectsAnimationPanel.tsx  # GSAP preset picker, duration/delay/loop, live replay
  App.tsx
  main.tsx
```

### How sizing works

`CanvasStage` always renders the mockup at its **true pixel dimensions** (`canvas.width` × `canvas.height`), then applies a CSS `transform: scale()` purely for on-screen fit — computed from the viewport size via a `ResizeObserver`. Export temporarily removes that transform so `html2canvas` always rasterizes at full resolution (2x by default).

The asset itself is **not** aspect-locked to its wrapper: `Asset width %` and `Asset height %` are independent sliders relative to the padded canvas wrapper, with an explicit lock/unlock toggle that mirrors one axis onto the other when engaged.

### Extending it

- New chrome styles: add a case to `ChromeStyle` in `types/editor.ts` and a branch in `WindowChrome.tsx`'s `ChromeBar`.
- New animation presets: add an entry to `ANIMATION_GROUPS` in `lib/animations.ts` — a GSAP `from`/`to` var pair, optional `ease`, and `continuous: true` for always-looping flourishes.
- New canvas presets: extend `CANVAS_PRESETS` in `store/presets.ts`.
- New export formats (SVG/PDF/clipboard): add alongside `exportImage.ts`, reusing the same "strip transform → capture → restore" pattern.

## License

MIT — do whatever you like with it.
