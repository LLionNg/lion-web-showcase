import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Experience from "./cosmos/Experience";
import Overlay from "./cosmos/Overlay";
import { DBG } from "./cosmos/debug";
import { scrollState } from "./cosmos/progress";

// Cesium is heavy — code-split it so the rest of the app stays lean.
const HomeEarth = lazy(() => import("./cosmos/HomeEarth"));

// Where the Earth hands off to the cosmic zoom: the cosmos scroll jumps to the
// Solar System on hand-off, and scrolling back up past it returns to the Earth.
const HANDOFF_OFFSET = 0.22;
const HANDBACK_BELOW = 0.18;

const scrollEl = () =>
  [...document.querySelectorAll("div")].find(
    (e) => e.scrollHeight > e.clientHeight + 5,
  );

export default function App() {
  // true = interactive Cesium Earth on top; false = R3F cosmic zoom.
  const [earthActive, setEarthActive] = useState(true);

  // Earth → cosmos: zoom-out past the full globe drops you into the solar system.
  const toCosmos = useCallback(() => {
    const sc = scrollEl();
    if (sc) sc.scrollTop = (sc.scrollHeight - sc.clientHeight) * HANDOFF_OFFSET;
    setEarthActive(false);
  }, []);

  // Cosmos → Earth: scrolling back up to the solar system returns to the globe.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (earthActive) return;
      if (e.deltaY < 0 && scrollState.offset <= HANDBACK_BELOW) setEarthActive(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [earthActive]);

  return (
    <div className="app">
      <Canvas
        className="canvas"
        frameloop="always"
        camera={{ position: [0, 0, 6], fov: 50, near: 0.3, far: 150 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <color attach="background" args={["#05060a"]} />
        <Suspense fallback={null}>
          <ScrollControls pages={7} damping={0.3}>
            <Experience />
          </ScrollControls>
        </Suspense>

        {DBG.bloom && (
          <EffectComposer>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.22}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.4} darkness={0.55} />
          </EffectComposer>
        )}
      </Canvas>

      <Suspense fallback={null}>
        <HomeEarth active={earthActive} onZoomOutToCosmos={toCosmos} />
      </Suspense>

      <Overlay />
    </div>
  );
}
