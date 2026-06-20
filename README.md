# web-showcase

An interactive developer portfolio that opens on a live **globe.gl Earth** and
lets you travel in two directions: **scroll out** through a "Powers of Ten"
cosmic zoom to the observable universe, or **dive in** through a warp into a
futuristic portfolio.

Built with **Vite + React + TypeScript + React Three Fiber**. No backend, no
secrets — static output, deployable to the Vercel free tier.

## The experience

- **Earth** ([`HomeEarth.tsx`](src/cosmos/HomeEarth.tsx)) — a globe.gl (three.js)
  globe with a real-time, per-viewer day/night terminator + city lights, country
  hover (outline + stats popup), and an atmosphere. Drag to orbit; scroll or
  swipe to travel.
- **Cosmos** ([`Experience.tsx`](src/cosmos/Experience.tsx)) — scroll out past the
  globe and six cross-fading scale "stages" (Solar System → Milky Way →
  Sagittarius A\* → galaxy → observable universe) hand off as one continuous
  zoom. A literal zoom across ~60 orders of magnitude breaks float precision, so
  this uses the classic **"Powers of Ten" hand-off** instead.
- **Portfolio** ([`Portfolio.tsx`](src/portfolio/Portfolio.tsx)) — dive in (or use
  the Enter Portfolio button) to a scroll-driven portfolio with a 3D
  mouse/touch-tilt background, a particle constellation, a scroll-cosmos reveal,
  and an infinite drag/swipe project carousel.

Works with mouse, trackpad, and touch; honors `prefers-reduced-motion`.

## Tech stack

| Concern       | Tool                                                  |
| ------------- | ----------------------------------------------------- |
| Build / dev   | **Vite** + **TypeScript**                             |
| Rendering     | **React Three Fiber** (Three.js) + **globe.gl**       |
| Helpers / FX  | **@react-three/drei**, **@react-three/postprocessing**|
| Smooth scroll | drei `ScrollControls` (cosmos) + **Lenis** (portfolio)|

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build to dist/
npm run preview  # preview the production build locally
```

## Deploy (Vercel)

Static SPA — no backend or environment variables required. Import the repo in the
Vercel dashboard or run `vercel`. Settings are pinned in
[`vercel.json`](vercel.json) and otherwise auto-detected:

- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

## Credits

- Planet + Sun surface maps in `public/textures/planets/` are by
  [Solar System Scope](https://www.solarsystemscope.com/textures/), licensed
  **CC BY 4.0**, downscaled.
- The Sagittarius A\* black-hole shader and accretion-disk textures are adapted
  from [threejs-blackhole](https://github.com/aaqibb13/threejs-blackhole)
  (Apache-2.0 / MIT).
- Earth day / night textures are from the three.js examples (NASA imagery).
