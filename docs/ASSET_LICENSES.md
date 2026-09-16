# Asset Licenses & Provenance

Every non-code asset shipped by Pluma Frame Next, and where it came from.

## Demo screenshots — `next/public/demo/`

| File | Provenance | License |
| --- | --- | --- |
| `dashboard.png` | AI-generated original, created for this project (2026-09-16) | Same license as the project |
| `appui.png` | AI-generated original, created for this project (2026-09-16) | Same license as the project |
| `photo.png` | AI-generated original, created for this project (2026-09-16) | Same license as the project |

No stock photography, no third-party screenshots, no BrandBird archive assets.

## Fonts

Pluma Frame Next bundles **no font files**. Text rendering uses system font stacks
(`chibuikeFontStack` in `src/chibuike/chibuikeRender.ts`) resolving to platform
UI fonts (system-ui / ui-serif / ui-monospace classes). The four variable font ids
(`CHIBUIKE_FONTS`) map to those stacks at paint time.

For reference-context only: the BrandBird archive (see `docs/BRANDBIRD_SOURCE_AUDIT.md`)
bundled Inter, IBM Plex Mono, Lora and Shadows Into Light — all open-licensed families
(SIL Open Font License or equivalent). None of their binaries are used here.

## Icons

All UI icons are **original SVG path geometry** authored for this project in
`next/src/ui/Icon.tsx` (stroke-style, 24 px grid, ~70 glyphs) plus the icon-library
set in `next/src/chibuike/chibuikeIcons.ts` (fill-style, searchable). No Font Awesome,
Lucide, Material or other third-party icon files are embedded; the visual style is
inspired by the professional stroke-icon genre but every path is written from scratch.

## Favicon & logo

`next/public/favicon.svg` — original mark authored for this project.

## Reference archive

`brandbird.rar` / `.audit/brandbird-extracted/` are **reference-only and not distributed**.
Nothing from them is linked, copied, or shipped (see `docs/BRANDBIRD_SOURCE_AUDIT.md`).
