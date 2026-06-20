import { useEffect, useRef } from "react";
import * as THREE from "three";
import Globe, { type GlobeInstance } from "globe.gl";
import CountryPopup, {
  type PopupHandle,
  type CountryStats,
} from "./CountryPopup";

/**
 * Homepage opening "Earth": a WebGL globe (globe.gl / three.js) with a real-time
 * day/night terminator + city lights, country hover (outline + stats popup), and
 * an atmosphere glow. Drag to orbit, scroll to zoom. Zoom OUT past the framed
 * globe hands off to the R3F cosmic zoom (`onZoomOutToCosmos`); zoom IN close to
 * the surface dives THROUGH into the portfolio (`onZoomIntoPortfolio`) — also
 * reachable via the Enter Portfolio button. `phase` drives visibility + render.
 *
 * Reworked from CesiumJS to globe.gl: no ion token, no tile quota, and (by
 * design) no satellite city zoom.
 */

const DAY_TEX = "/textures/earth_atmos_2048.jpg";
const NIGHT_TEX = "/textures/earth_blackmarble.jpg";

// POV altitude is in globe-radius units. Default framed view ~2.5.
const START_ALT = 2.5;
const MAX_ALT = 3.6; // zoom-out cap; scrolling out past this -> cosmos
const DIVE_ALT = 0.3; // zoom-in floor; scrolling in past this -> portfolio
const GLOBE_R = 100; // three-globe globe radius (for the controls distance clamp)
// Longitude offset (deg) if globe.gl's texture UV origin needs a constant shift
// to align the day/night terminator with the continents. Tuned by inspection.
const LNG_OFFSET = 0;

export type EarthPhase = "active" | "faded" | "warp" | "hidden";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Feat = any;

// Real-time subsolar point (where the sun is overhead) -> day/night terminator.
function subsolar(date: Date): { lat: number; lng: number } {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear =
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      yearStart) /
    86_400_000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  return { lat: decl, lng: (12 - utcHours) * 15 };
}

export default function HomeEarth({
  phase,
  onZoomOutToCosmos,
  onZoomIntoPortfolio,
  homeSignal,
}: {
  phase: EarthPhase;
  onZoomOutToCosmos: () => void;
  onZoomIntoPortfolio: () => void;
  homeSignal: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const handoffRef = useRef(onZoomOutToCosmos);
  handoffRef.current = onZoomOutToCosmos;
  const diveRef = useRef(onZoomIntoPortfolio);
  diveRef.current = onZoomIntoPortfolio;
  const divedRef = useRef(false);
  const popupRef = useRef<PopupHandle>(null);
  const clearHoverRef = useRef<() => void>(() => {});

  // build the globe once
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const world: GlobeInstance = new Globe(el, { animateIn: false })
      .width(window.innerWidth)
      .height(window.innerHeight)
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor("#6ea8ff")
      .atmosphereAltitude(0.2);
    globeRef.current = world;
    // Cap the pixel ratio: the day/night + atmosphere are full-screen shaders,
    // so 2x DPI quadruples their per-pixel cost. 1.5x stays crisp while keeping
    // the globe light enough that the cosmos -> Earth hand-off stays smooth.
    world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    if (import.meta.env.DEV)
      (window as unknown as { __globe?: GlobeInstance }).__globe = world;

    // ---- day/night material ----
    // The blend is computed in GEOGRAPHIC (UV) space — each fragment's lat/lng
    // comes from the equirectangular UV, and we compare it to the sun's subsolar
    // lat/lng — so the terminator always lines up with the texture's continents
    // (a 3D-normal approach mismatched globe.gl's internal frame and inverted it).
    const loader = new THREE.TextureLoader();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: loader.load(DAY_TEX) },
        nightTexture: { value: loader.load(NIGHT_TEX) },
        sunLatLng: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec2 sunLatLng;
        varying vec2 vUv;
        #define DEG 0.0174532925
        void main() {
          float lng = (vUv.x * 360.0 - 180.0) * DEG;
          float lat = (90.0 - vUv.y * 180.0) * DEG;
          float sLat = sunLatLng.x * DEG;
          float sLng = sunLatLng.y * DEG;
          float cosAng = sin(lat) * sin(sLat) + cos(lat) * cos(sLat) * cos(lng - sLng);
          float blend = smoothstep(-0.12, 0.25, cosAng);
          vec3 day = texture2D(dayTexture, vUv).rgb;
          // dim earth under the city lights so the night side is never pure
          // black (the globe always reads as a sphere, even over night oceans)
          vec3 night = texture2D(nightTexture, vUv).rgb + day * 0.10;
          gl_FragColor = vec4(mix(night, day, blend), 1.0);
        }
      `,
    });
    world.globeMaterial(material);

    // sun moves with real (UTC) time -> recompute its subsolar lat/lng.
    const updateSun = () => {
      const s = subsolar(new Date());
      material.uniforms.sunLatLng.value.set(s.lat, s.lng + LNG_OFFSET);
    };
    updateSun();
    const sunTimer = window.setInterval(updateSun, 60_000);

    // Touch-primary device? Hover needs a pointer, so on phones/tablets we skip
    // the country polygons entirely below - a big render saving (177 filled +
    // stroked polygons gone) and the only thing lost is a hover feature touch
    // can't use anyway. Also disables one-finger orbit (see controls, below).
    const isTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    // ---- country hover: outline highlight + stats popup (pointer devices) ----
    let hovered: Feat | null = null;
    let mx = 0;
    let my = 0;
    const statsOf = (f: Feat): CountryStats => {
      const p = f.properties;
      return {
        name: p.NAME_LONG || p.NAME || p.ADMIN || "",
        population: Number(p.POP_EST ?? -1),
        gdp: Number(p.GDP_MD ?? -1),
        continent: p.CONTINENT || "",
        subregion: p.SUBREGION || "",
        income: p.INCOME_GRP || "",
        iso2: String(p.ISO_A2_EH || p.ISO_A2 || "").toLowerCase(),
      };
    };
    const applyHover = (h: Feat | null) => {
      world
        .polygonAltitude((d: Feat) => (d === h ? 0.014 : 0.006))
        .polygonCapColor((d: Feat) =>
          d === h ? "rgba(110,168,255,0.28)" : "rgba(0,0,0,0)",
        )
        .polygonStrokeColor((d: Feat) =>
          d === h ? "#8fe8ff" : "rgba(150,180,255,0.10)",
        );
    };
    clearHoverRef.current = () => {
      hovered = null;
      applyHover(null);
      popupRef.current?.set(null, 0, 0);
    };

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (hovered) popupRef.current?.set(statsOf(hovered), mx, my);
    };
    if (!isTouch) {
      fetch("/data/countries.geojson")
        .then((r) => r.json())
        .then((g) => {
          world
            .polygonsData(g.features)
            .polygonCapColor(() => "rgba(0,0,0,0)")
            .polygonSideColor(() => "rgba(0,0,0,0)")
            .polygonStrokeColor(() => "rgba(150,180,255,0.10)")
            .polygonAltitude(0.006)
            .onPolygonHover((poly: Feat | null) => {
              if (poly === hovered) return;
              hovered = poly;
              applyHover(poly);
              if (poly) popupRef.current?.set(statsOf(poly), mx, my);
              else popupRef.current?.set(null, 0, 0);
            });
        })
        .catch((e) => console.warn("countries:", e));
      el.addEventListener("mousemove", onMouseMove);
    }

    // ---- controls + zoom hand-offs ----
    const controls = world.controls();
    controls.minDistance = GLOBE_R * 1.05;
    controls.maxDistance = GLOBE_R * (1 + MAX_ALT + 0.5);
    controls.enablePan = false;
    world.pointOfView({ lat: 12, lng: -40, altitude: START_ALT });

    const onWheel = (e: WheelEvent) => {
      const alt = world.pointOfView().altitude ?? START_ALT;
      if (e.deltaY > 0) {
        // zoom OUT at the framed globe -> cosmos
        if (alt >= MAX_ALT) handoffRef.current();
      } else if (e.deltaY < 0 && !divedRef.current && alt <= DIVE_ALT) {
        // zoom IN close to the surface -> portfolio
        divedRef.current = true;
        diveRef.current();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: true });

    // --- touch: swipe to TRAVEL, not spin into the dark side ---
    // On touch there is no wheel, so a one-finger drag just orbited the globe;
    // "swiping to scroll" rotated it onto the night side and it read as black.
    // Instead, disable one-finger orbit and map a deliberate vertical swipe to
    // the same hand-offs as the wheel: up = out to the cosmos, down = dive into
    // the portfolio. (Pinch-zoom on the globe still works.)
    let tY = 0;
    let tX = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      tY = e.touches[0].clientY;
      tX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dy = t.clientY - tY;
      const dx = t.clientX - tX;
      // require a clear, mostly-vertical swipe
      if (Math.abs(dy) < 46 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      if (dy < 0) {
        handoffRef.current(); // swipe up -> out to the cosmos
      } else if (!divedRef.current) {
        divedRef.current = true;
        diveRef.current(); // swipe down -> dive into the portfolio
      }
    };
    // On a touch-primary device, one-finger orbit is what spun the globe into
    // the dark side, so turn it off (pinch-zoom still works).
    if (isTouch) controls.enableRotate = false;
    // Attach the swipe handlers always: touch events only fire from real touch
    // input (a no-op for a mouse), so this is safe on every device.
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    const onResize = () =>
      world.width(window.innerWidth).height(window.innerHeight);
    window.addEventListener("resize", onResize);

    return () => {
      window.clearInterval(sunTimer);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      world._destructor?.();
      globeRef.current = null;
    };
  }, []);

  // phase -> render loop + re-arm the dive (visibility itself is CSS-driven)
  useEffect(() => {
    const world = globeRef.current;
    if (!world) return;
    const live = phase === "active";
    if (live) {
      // Resume rendering. The size is kept current by the resize listener, so we
      // intentionally DON'T call setSize here — its buffer reallocation hitched
      // the start of the fly-back out of the portfolio.
      world.resumeAnimation();
      divedRef.current = false;
    } else {
      world.pauseAnimation();
      clearHoverRef.current();
    }
  }, [phase]);

  // returning from the portfolio -> fly the camera back out to the globe
  useEffect(() => {
    const world = globeRef.current;
    if (!world || !homeSignal) return;
    world.pointOfView({ lat: 12, lng: -40, altitude: START_ALT }, 1600);
  }, [homeSignal]);

  return (
    <>
      <div
        ref={ref}
        className={`home-earth home-earth--${phase}`}
        aria-hidden={phase !== "active"}
      />
      <CountryPopup ref={popupRef} />
    </>
  );
}
