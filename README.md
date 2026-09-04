# Tiles Gallery

Interactive 3D CSS tile photo gallery.

[Live demo](https://intredd.github.io/tiles-gallery/)

A 3×3 grid of CSS 3D tiles that browse a photo set as whole images or as one photo sliced across the grid. Pointer tilt and flip live in CSS transforms, not a canvas. Clone the repo, then `npm ci` and `npm run dev`.

## Features

- 3×3 CSS 3D tile grid (`App` mounts `<Gallery size={3} />`)
- **Gallery** mode: each cell is a full photo from the current 9-image page
- **Fullscreen** mode: mosaic slices of one photo across the grid
- Click a gallery tile to open that photo as a mosaic
- Prev/next: pages in gallery, single photos in fullscreen (wraps)
- Keyboard: ArrowLeft / ArrowRight, M to toggle mode
- Pointer “look” tilt via `useTileLook` (rAF + direct DOM transforms)
- Flip on x / next / prev; one-frame `snap` when the rotate axis changes
- Motion timings in `src/config/motion.ts` as CSS variables
- 27 photos in `public/images/`

## Controls

| Input | Action |
| --- | --- |
| Click a tile | Open that photo as a fullscreen mosaic (gallery mode only) |
| Prev / Next buttons | Previous or next page (gallery) or photo (fullscreen) |
| ArrowLeft / ArrowRight | Same as prev / next |
| M | Toggle gallery ↔ fullscreen |

## Tech stack

React 19, Vite 6 (SWC), Sass, CSS 3D transforms.

Sources are `.ts` / `.tsx`. There is no `tsconfig` or `typescript` package — Vite/SWC transpile only.

## Quick start

```bash
npm ci          # or: npm install
npm run dev     # Vite HMR
npm run build   # dist/
npm run preview # serve dist/
```

## Scripts

| Script | Command | What it does |
| --- | --- | --- |
| `dev` | `vite` | Dev server with HMR |
| `build` | `vite build` | Production bundle to `dist/` |
| `lint` | `eslint .` | ESLint (`**/*.{js,jsx}` only; `.ts`/`.tsx` are not in the config) |
| `preview` | `vite preview` | Serve the production build |

## How it works

**Modes.** `gallery` paints each cell as a whole photo (`paintsFor('full', …)`). `fullscreen` paints mosaic slices of one photo across the grid (`paintsFor('mosaic', …)` via `paintTile`). Clicking a tile in gallery opens that photo as mosaic.

**Flip.** Tiles rotate on `x` (mode change / open), `next`, or `prev`. Switching axes uses a one-frame `snap` (`transition: none`) so CSS does not interpolate competing `rotateX` / `rotateY`.

**Look.** `useTileLook` tilts tiles toward the pointer with rAF and direct DOM transforms, off the React render path. On open, look is handed to CSS (`releaseToCss`) so the settle can ease, then resets.

**Motion.** Tokens in `src/config/motion.ts` (durations, easing, perspective) are applied as CSS variables through `motionStyle()` on the gallery root.

**Data.** `App` mounts `<Gallery size={3} />` — 9 cells. `src/data/images.ts` lists 27 photos under `public/images/`.

## License

MIT. Copyright (c) 2026 Aleskei.
