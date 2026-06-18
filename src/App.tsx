import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Experience from "./cosmos/Experience";
import Overlay from "./cosmos/Overlay";
import { DBG } from "./cosmos/debug";

export default function App() {
  return (
    <div className="app">
      <Canvas
        className="canvas"
        // Render continuously (don't fall back to on-demand, which leaves the
        // scene blank until a mouse move and looks like stutter).
        frameloop="always"
        // Tight near/far ratio keeps depth-buffer precision high so close
        // surfaces (e.g. Earth + its cloud shell) never z-fight / shimmer.
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
          {/* 7 pages of scroll length, damped for a buttery smooth feel. */}
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

      <Overlay />
    </div>
  );
}
