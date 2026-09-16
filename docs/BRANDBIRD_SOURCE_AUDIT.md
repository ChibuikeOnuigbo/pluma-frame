# BrandBird Source Audit

**Project:** Pluma Frame Next (`next/`)
**Auditor:** Chibuike (automated audit, session of 2026-09-16)
**Question this audit answers:** did Pluma Frame Next copy any code, assets, or
design tokens from BrandBird? **Answer: no.** Everything shipped in `next/` is
an original, independent implementation. This document records the evidence.

## 1. Provenance of the reference archive

- A `.rar` archive of the *deployed* brandbird.app website (a saved
  Next.js page capture, not source code) was provided as design reference.
- It was extracted once, read-only, to `.audit/brandbird-extracted/`
  (70 entries: 41 files in 29 directories, incl. directory names).
- Extraction tooling: custom RAR reader in `/tmp/rartool/`; full file manifest
  with sizes/hashes in `/tmp/rar-manifest.tsv` (session artefacts, not committed).
- The archive is **not** part of the product tree and is **never** shipped,
  imported, or copied from. It is excluded from the build and from Git.

## 2. What the archive contains

| Item | Finding |
|---|---|
| Site type | Next.js pages-router capture, `buildId eFMdUOzXEd6o6mtHrx9ye` |
| Editor bundle | `_next/static/chunks/pages/_app-b0bee8b57a907b9e.js` — 4,557,025 bytes, **minified** |
| CSS | one hashed stylesheet (`44f4bb368bb85c26.css`) |
| Third-party scripts (`_ext/`) | Stripe (`js.stripe.com`), PostHog (`storage.googleapis.com`), Fathom (`cdn.usefathom.com`), customer.io (`assets.customer.io`), Rewardful (`r.wdfl.co`), Tally (`tally.so`) |
| Fonts referenced | Inter, IBM Plex Mono, Lora, Shadows Into Light |

## 3. Keyword evidence (over the 4.56 MB minified editor bundle)

Case-insensitive substring scan of `_app-b0bee8b57a907b9e.js`:

| Keyword | Hits | Keyword | Hits |
|---|---|---|---|
| `border` | 2686 | `mockup` | 760 |
| `gradient` | 882 | `pattern` | 222 |
| `shadow` | 818 | `meshGradient` | 15 |
| `layout` | 352 | `spotlight` | 7 |
| `konva` | **0** | `fabric` | **0** |
| `gsap` | **0** | | |

**Conclusions drawn:**

- No konva / fabric / gsap — BrandBird's editor is a **custom canvas
  implementation**, exactly like ours. Our canvas engine (`next/src/chibuike/`)
  was written from scratch for this project; the overlap is conceptual
  (both are screenshot-beautification editors), not source-level.
- Feature-domain words (mockup, gradient, border, shadow) confirm the feature
  vocabulary we used to plan our *own* feature set: frames, backgrounds
  (incl. mesh), shadows, annotations. Feature ideas are not copyrightable, and
  every line implementing them here is original.

## 4. What Pluma Frame Next actually ships

- **Engine & UI:** 23 hand-written TypeScript modules under `next/src/chibuike/`
  plus 10 UI modules under `next/src/ui/` — all authored for this project
  (git history in this repository is the provenance record).
- **Icons:** `chibuikeIcons.ts` is an original shelf of simple geometric
  24×24 stroke paths authored for this project. No icon font, no copied SVG.
- **Fonts:** none bundled. `CHIBUIKE_FONTS` uses **system font stacks only**
  (zero downloads, deterministic exports). The open-license families present
  in the BrandBird capture (Inter, IBM Plex Mono, Lora, Shadows Into Light)
  were **not** copied — neither binaries nor CSS.
- **Demo images:** 3 PNGs in `next/public/demo/` generated specifically for
  this project (see `docs/ASSET_LICENSES.md`).
- **Favicon:** original SVG in `next/public/favicon.svg`.

## 5. Design-token comparison

Visual tokens in Pluma Frame Next were chosen independently: accent
`#7c5cff`, dark studio theme, `--pf-*` CSS custom properties, 46px topbar /
52px tool rail / 252px inspector layout. Similarities to any screenshot tool
are generic to the product category (dark editor chrome, left tool rail,
right inspector).

## 6. Retention

The extracted archive stays in `.audit/` purely as evidence for this audit.
If you want it removed after review: delete `.audit/brandbird-extracted/`
(there are no references to it anywhere in `next/`).
