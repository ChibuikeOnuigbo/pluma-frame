# Asset Licenses — Pluma Frame Next

Everything shipped in this app is either original work created for this
project or uses no third-party material at all. Itemized below.

## 1. Demo images (`public/demo/`)

Generated **specifically for this project** as AI-generated originals; not
scanned from any existing product, website, or stock library. No attribution
required; treat as CC0 within this project.

| File | Content | Used by |
|---|---|---|
| `dashboard.png` | fictional analytics dashboard screenshot | landing demo + QA ingest fixture |
| `appui.png` | fictional app UI screenshot | landing demo rotation |
| `photo.png` | photographic-style sample image | landing demo rotation |

## 2. Icons (`src/chibuike/chibuikeIcons.ts`)

An original shelf of simple geometric 24×24 stroke paths authored for this
project ("searchable icon shelf"). No icon font, no copied SVG sets.
Same license as the project.

## 3. Fonts

**None bundled — zero font downloads.** The app uses system font stacks only
(`CHIBUIKE_FONTS` in `src/chibuike/chibuikeText.ts`):

- System Sans — `-apple-system, "Segoe UI", Inter, Roboto, …`
- Serif — `Georgia, "Times New Roman", serif`
- Mono — `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace`
- Rounded — `ui-rounded, Quicksand, Comfortaa, …` (system stacks)

If a user's OS provides these fonts, the OS's own license applies; the app
ships no font binaries, `@font-face` rules, or webfont links.

> Reference note: the BrandBird capture under `.audit/` references Inter,
> IBM Plex Mono, Lora and Shadows Into Light (all open-license families).
> **None of them are copied into this project** — see
> `docs/BRANDBIRD_SOURCE_AUDIT.md`.

## 4. Logo / favicon (`public/favicon.svg`)

Original mark drawn for this project (feather-in-frame motif). Same license
as the project.

## 5. Third-party runtime dependencies

Runtime: `react`, `react-dom` (MIT), `qrcode-generator` (MIT). Build/dev:
Vite, TypeScript, Vitest, esbuild, rollup and friends (MIT), plus dev-only QA
tooling (`@sparticuz/chromium` — MIT/Apache-2.0 components; `puppeteer-core`
— Apache-2.0; `@playwright/test` — Apache-2.0). None of these are modified,
and no dependency code is vendored into the bundle.

## 6. What is deliberately NOT here

- No assets extracted from the BrandBird reference archive
  (`.audit/brandbird-extracted/` is evidence-only, never shipped).
- No stock photos, icon packs, emoji sets, or webfonts from third parties.
- No telemetry or third-party scripts of any kind in the product.
