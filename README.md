# Cosmic Zoom — Scroll-Driven WebGL Journey

An immersive, scroll-driven experience that zooms outward across the scales of
the cosmos — from **Earth → the Solar System → into the Milky Way → Sagittarius A\***
**→ the full galaxy → the Observable Universe**.

This is the smooth-scrolling foundation of the portfolio showcase.

## How it works

A literal zoom across ~60 orders of magnitude breaks floating-point precision,
so this uses the classic **"Powers of Ten" hand-off**: six self-contained scale
"stages" that cross-fade and scale into/out of one another as the scroll offset
advances, reading as one continuous zoom-out.

- **Smooth scroll** — `drei` `ScrollControls` with damping drives a normalized
  `0 → 1` scroll offset (no scroll-jacking; native scroll underneath).
- **Stage hand-off** — [`Stage.tsx`](src/cosmos/Stage.tsx) maps that offset to
  each scale's opacity + scale every frame (see `stageState` in
  [`util.ts`](src/cosmos/util.ts)).
- **Captions** — a DOM layer ([`Overlay.tsx`](src/cosmos/Overlay.tsx)) reads the
  scroll offset through a lightweight module bridge and fades titles in/out.
- **Glow** — `@react-three/postprocessing` Bloom + a subtle Vignette.

## Tech stack

| Concern        | Tool                                            |
| -------------- | ----------------------------------------------- |
| Build / dev    | **Vite** + **TypeScript**                       |
| Rendering      | **React Three Fiber** (Three.js)                |
| Helpers        | **@react-three/drei**                           |
| Post FX        | **@react-three/postprocessing** (Bloom)         |
| Smooth scroll  | drei `ScrollControls` (damped)                  |

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # typecheck + production build to dist/
npm run preview  # preview the production build
```

## Deploy (Vercel free tier)

Static output — no adapter needed. Either import the repo in the Vercel
dashboard or run `vercel`. Build settings are auto-detected:

- **Build command:** `npm run build`
- **Output directory:** `dist`

## Notes

- Honors `prefers-reduced-motion` (idle rotation/parallax disabled).
- Earth, Moon, and surface textures live in `public/textures/` (NASA imagery via
  the three.js examples).

## Credits

- Planet + Sun surface maps in `public/textures/planets/` (Sun, Mercury, Venus,
  Mars, Jupiter, Saturn + ring, Uranus, Neptune) are by
  [Solar System Scope](https://www.solarsystemscope.com/textures/), licensed
  **CC BY 4.0**, downscaled to 512px.
- The Sagittarius A\* black hole shader and its Milky Way / accretion-disk
  textures are adapted from
  [threejs-blackhole](https://github.com/aaqibb13/threejs-blackhole) (Apache-2.0 / MIT).
