import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, useScroll } from "@react-three/drei";
import * as THREE from "three";
import Stage from "./Stage";
import { scrollState } from "./progress";
import { prefersReducedMotion } from "./util";
import { DBG } from "./debug";
import Earth from "./stages/Earth";
import SolarSystem from "./stages/SolarSystem";
import MilkyWay from "./stages/MilkyWay";
import BlackHole from "./stages/BlackHole";
import Galaxy from "./stages/Galaxy";
import Universe from "./stages/Universe";

// Publishes the smooth scroll offset to the DOM caption layer each frame.
function ScrollReporter() {
  const scroll = useScroll();
  useFrame(() => {
    scrollState.offset = scroll.offset;
  });
  return null;
}

// Subtle pointer parallax for depth/immersion. Gentle magnitude + clamped
// frame-delta so the closest object (Earth) doesn't judder when frame timing
// is irregular.
function PointerParallax() {
  const target = useRef(new THREE.Vector2());
  useFrame((state, dt) => {
    if (prefersReducedMotion || DBG.noParallax) return;
    const k = 1 - Math.pow(0.0015, Math.min(dt, 1 / 30));
    target.current.lerp(state.pointer, k);
    state.camera.position.x = target.current.x * 0.18;
    state.camera.position.y = target.current.y * 0.13;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function Experience() {
  return (
    <>
      <ScrollReporter />
      <PointerParallax />

      <ambientLight intensity={0.35} />
      {/* Keyed from near the camera so the hero globe reads as a near-full disk. */}
      <directionalLight position={[3, 1.5, 5]} intensity={2.4} color="#fff6ec" />
      <directionalLight position={[-5, -2, -3]} intensity={0.25} color="#3a5a9a" />

      {/* Persistent deep-space backdrop so transitions never go fully black. */}
      <Stars radius={120} depth={60} count={4000} factor={4} fade speed={0.4} />

      <Stage
        start={0.0}
        end={0.16}
        fadeIn={false}
        bigScale={1.05}
        smallScale={0.12}
        z={0}
      >
        <Earth />
      </Stage>

      <Stage start={0.14} end={0.32} z={-0.6} bigScale={1.5} smallScale={0.1}>
        <SolarSystem start={0.14} end={0.32} />
      </Stage>

      <Stage start={0.28} end={0.44} z={-1.2}>
        <MilkyWay />
      </Stage>

      {/* Gentle entry scale + wide window so the black hole eases in rather
          than slamming into frame; starts after the Milky Way caption. */}
      {/* Full-screen ray-traced black hole. The Stage gates visibility (so it
          only ray-marches on screen); the shader handles its own fade + zoom.
          Same width as before — shifted earlier to open room for the galaxy. */}
      <Stage start={0.4} end={0.64} z={-1.8}>
        <BlackHole start={0.4} end={0.64} />
      </Stage>

      {/* Extended, with a clean dominant window (~0.64–0.72) after the black
          hole and before the Universe field rises. */}
      <Stage start={0.54} end={0.88} z={-2.4}>
        <Galaxy />
      </Stage>

      {/* Starts earlier so its galaxy field is already there as the Milky Way
          shrinks — the spiral recedes *into* the field instead of vanishing. */}
      <Stage
        start={0.72}
        end={1.0}
        fadeOut={false}
        bigScale={1.5}
        smallScale={1.0}
        z={-3.0}
      >
        <Universe />
      </Stage>
    </>
  );
}
