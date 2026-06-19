import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

/**
 * Homepage opening "Earth": the interactive Cesium globe (drag to orbit, scroll
 * to dive into a city — satellite + Google Photorealistic 3D buildings). Zoom is
 * capped at the full globe; scrolling OUT past that hands off to the R3F cosmic
 * zoom (solar system → universe) via `onZoomOutToCosmos`. And at the BOTTOM —
 * once you're at street level and keep zooming in — it dives THROUGH into the
 * portfolio via `onZoomIntoPortfolio`. `phase` drives visibility + render loop.
 */

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN as string;
const GOOGLE_3DTILES_ASSET = 2275207;
const TILES_HEIGHT = 180_000; // below this (m) show the photoreal 3D tiles
const MAX_HEIGHT = 28_000_000; // zoom-out cap: full globe framed (m)
// Scroll out past this altitude → hand off to the cosmos. Kept well below the
// cap so the hand-off reliably fires (you can't get "stuck" at the globe).
const HANDOFF_HEIGHT = 20_000_000;
// "Zoom until you can't": once you're within DIVE_NEAR metres of the surface
// (close to any city, whatever its elevation) and a zoom-in tick no longer
// moves the camera more than DIVE_STUCK metres — i.e. it's pinned at the
// minimum zoom (street level) — dive through into the portfolio. Tunable.
const DIVE_NEAR = 8_000;
const DIVE_STUCK = 2;

export type EarthPhase = "active" | "faded" | "warp" | "hidden";

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
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const handoffRef = useRef(onZoomOutToCosmos);
  handoffRef.current = onZoomOutToCosmos;
  const diveRef = useRef(onZoomIntoPortfolio);
  diveRef.current = onZoomIntoPortfolio;
  const divedRef = useRef(false);

  // create the viewer once
  useEffect(() => {
    if (!ION_TOKEN) {
      console.error("Missing VITE_CESIUM_ION_TOKEN");
      return;
    }
    Cesium.Ion.defaultAccessToken = ION_TOKEN;

    const viewer = new Cesium.Viewer(ref.current!, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      terrain: Cesium.Terrain.fromWorldTerrain(),
    });
    viewerRef.current = viewer;

    const scene = viewer.scene;
    const globe = scene.globe;
    globe.enableLighting = true;
    globe.depthTestAgainstTerrain = true;
    viewer.clock.shouldAnimate = true;
    scene.highDynamicRange = true;

    // free orbit + zoom, but capped at the full globe (handoff happens there)
    const cc = scene.screenSpaceCameraController;
    cc.maximumZoomDistance = MAX_HEIGHT;
    cc.minimumZoomDistance = 30;

    // night-side city lights (self-hosted Black Marble). Kept as a ref so we can
    // hide it on deep zoom — it's a low-res whole-globe texture that's near-black
    // up close and was bleeding through the 3D-tile gaps as dark polygons.
    let nightLayer: Cesium.ImageryLayer | undefined;
    Cesium.SingleTileImageryProvider.fromUrl("/textures/earth_blackmarble.jpg")
      .then((p) => {
        nightLayer = viewer.imageryLayers.addImageryProvider(p);
        nightLayer.dayAlpha = 0.0;
        nightLayer.nightAlpha = 1.0;
      })
      .catch((e) => console.warn("night layer:", e));

    // Google Photorealistic 3D Tiles — shown only on deep zoom
    let tileset: Cesium.Cesium3DTileset | undefined;
    Cesium.Cesium3DTileset.fromIonAssetId(GOOGLE_3DTILES_ASSET)
      .then((t) => {
        tileset = t;
        t.show = false;
        t.enableCollision = true; // tiles carry collision once the globe is hidden
        scene.primitives.add(t);
      })
      .catch((e) => console.error("3d tiles:", e));

    // Day/night from the real sun looks right from orbit, but Google's photoreal
    // tiles are DAYTIME captures — re-lighting them with the (below-horizon) sun
    // on the night side renders them dark/brown, and the near-black night globe
    // shows through gaps between tiles. So once we drop into a city, switch to a
    // flat camera "headlight" (whatever you look at stays lit) and turn off the
    // globe's day/night; restore the sun when back out at the globe.
    const sunLight = new Cesium.SunLight();
    const headlight = new Cesium.DirectionalLight({
      direction: Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Z),
      intensity: 2.0,
    });
    let inTiles = false;

    const removeToggle = scene.preRender.addEventListener(() => {
      const h = viewer.camera.positionCartographic?.height ?? Infinity;
      const showTiles = h < TILES_HEIGHT;
      if (tileset) tileset.show = showTiles;
      // The Google tileset IS a full globe; showing our day/night globe at the
      // same place makes the two surfaces z-fight into scattered dark polygons.
      // So show exactly one: globe out at orbit, photoreal tiles up close.
      globe.show = !showTiles;
      if (nightLayer) nightLayer.show = !showTiles; // dark globe texture → off up close
      if (showTiles !== inTiles) {
        inTiles = showTiles;
        globe.enableLighting = !showTiles;
        scene.light = showTiles ? headlight : sunLight;
      }
      // keep the headlight aimed where the camera looks while we're down low
      if (showTiles)
        Cesium.Cartesian3.clone(scene.camera.directionWC, headlight.direction);
    });

    // open framed on the full globe
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-40, 12, MAX_HEIGHT * 0.78),
    });

    // Wheel at the two extremes hands off to the neighbouring "world":
    //  · zoom OUT at the full globe → the cosmos (solar system → universe)
    //  · zoom IN at street level    → dive through into the portfolio
    let lastH = Infinity;
    const onWheel = (e: WheelEvent) => {
      const carto = viewer.camera.positionCartographic;
      if (!carto) return;
      const h = carto.height;
      if (e.deltaY > 0) {
        // zoom OUT at the full globe → cosmos
        if (h >= HANDOFF_HEIGHT) handoffRef.current();
      } else if (e.deltaY < 0 && !divedRef.current && h < DIVE_NEAR) {
        // zoom IN but the camera no longer drops → pinned at the min zoom
        // (street level) → dive through into the portfolio.
        if (Math.abs(h - lastH) < DIVE_STUCK) {
          divedRef.current = true;
          diveRef.current();
        }
      }
      lastH = h;
    };
    scene.canvas.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      scene.canvas.removeEventListener("wheel", onWheel);
      removeToggle();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // phase → render loop + re-arm the dive (visibility itself is CSS-driven)
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    const live = phase === "active";
    v.useDefaultRenderLoop = live; // stop GPU work when not the active layer
    if (live) {
      v.resize();
      divedRef.current = false; // re-arm the dive after returning from portfolio
    }
  }, [phase]);

  // returning from the portfolio → fly the camera back out to the globe
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !homeSignal) return;
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-40, 12, MAX_HEIGHT * 0.78),
      duration: 2.2,
    });
  }, [homeSignal]);

  return (
    <div
      ref={ref}
      className={`home-earth home-earth--${phase}`}
      aria-hidden={phase !== "active"}
    />
  );
}
