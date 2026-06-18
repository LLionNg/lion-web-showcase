import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ScrollControls, useScroll, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { lerp, smoothstep } from "../cosmos/util";
import { cityGroundTexture, windowTexture } from "./cityTextures";

/**
 * PROTOTYPE — zoom-in intro: Earth (night side) → Southeast Asia → a top-down
 * night-lit city. Cross-fade "Powers of Ten" hand-off, same idea as the main
 * experience but in the zoom-in direction. View at /?proto.
 *
 * Everything faces the camera (-Z), so the Earth's lit hemisphere and the city
 * share one orientation and the camera simply descends toward the surface.
 */

// Camera descends from "whole Earth" toward a low, slightly-oblique aerial.
function CameraRig() {
  const scroll = useScroll();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const o = smoothstep(0, 1, scroll.offset);
    state.camera.position.set(0, lerp(0, 1.6, o), lerp(6, 3.0, o));
    target.set(0, lerp(0, -0.2, o), lerp(0, 0.4, o));
    state.camera.lookAt(target);
  });
  return null;
}

// Earth, night-lights side, rotated so SE Asia faces the camera. Grows a touch
// and fades as we drop toward the surface.
function NightEarth() {
  const scroll = useScroll();
  const tex = useTexture("/textures/earth_night_2048.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame(() => {
    const o = scroll.offset;
    ref.current.scale.setScalar(lerp(1, 1.9, smoothstep(0, 0.7, o)));
    const op = 1 - smoothstep(0.4, 0.66, o);
    matRef.current.opacity = op;
    ref.current.visible = op > 0.001;
  });

  // rotation tuned so the Maritime SE Asia region sits toward +Z (the camera).
  return (
    <group ref={ref} rotation={[0.42, -1.95, 0]}>
      <mesh>
        <sphereGeometry args={[2, 96, 96]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          transparent
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface Building {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
}

// Procedural city: instanced glowing buildings on a grid + a glowing street
// ground. Ground is the XY plane (camera looks down -Z), buildings extrude +Z.
function City() {
  const scroll = useScroll();
  const winTex = useMemo(() => windowTexture(), []);
  const groundTex = useMemo(() => cityGroundTexture(), []);
  const groupRef = useRef<THREE.Group>(null!);
  const instRef = useRef<THREE.InstancedMesh>(null!);
  const groundMat = useRef<THREE.MeshBasicMaterial>(null!);
  const bldgMat = useRef<THREE.MeshStandardMaterial>(null!);

  const buildings = useMemo<Building[]>(() => {
    const arr: Building[] = [];
    const blocks = 12;
    const spacing = 1.5;
    const street = 0.55;
    for (let gx = -blocks; gx <= blocks; gx++) {
      for (let gy = -blocks; gy <= blocks; gy++) {
        if (Math.random() < 0.22) continue; // empty lots
        arr.push({
          x: gx * spacing + (Math.random() - 0.5) * 0.2,
          y: gy * spacing + (Math.random() - 0.5) * 0.2,
          w: spacing - street - Math.random() * 0.3,
          d: spacing - street - Math.random() * 0.3,
          h: 0.3 + Math.pow(Math.random(), 2.2) * 2.6,
        });
      }
    }
    return arr;
  }, []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    buildings.forEach((b, i) => {
      p.set(b.x, b.y, b.h / 2);
      s.set(b.w, b.d, b.h);
      m.compose(p, q, s);
      instRef.current.setMatrixAt(i, m);
    });
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  useFrame(() => {
    const op = smoothstep(0.5, 0.86, scroll.offset);
    groupRef.current.visible = op > 0.001;
    if (groundMat.current) groundMat.current.opacity = op;
    if (bldgMat.current) bldgMat.current.opacity = op;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Glowing street-grid ground (XY plane, facing the camera). */}
      <mesh>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial
          ref={groundMat}
          map={groundTex}
          transparent
          toneMapped={false}
        />
      </mesh>
      {/* Instanced buildings. */}
      <instancedMesh
        ref={instRef}
        args={[undefined, undefined, buildings.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={bldgMat}
          color="#0a0a14"
          emissiveMap={winTex}
          emissive="#ffffff"
          emissiveIntensity={1.3}
          roughness={1}
          metalness={0}
          transparent
        />
      </instancedMesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.25} />
      <NightEarth />
      <City />
    </>
  );
}

export default function CityZoom() {
  return (
    <div className="app">
      <Canvas
        className="canvas"
        frameloop="always"
        camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#03040a"]} />
        <Suspense fallback={null}>
          <ScrollControls pages={4} damping={0.3}>
            <Scene />
          </ScrollControls>
        </Suspense>
      </Canvas>

      <div className="overlay" aria-hidden="true">
        <div
          className="caption"
          style={{ opacity: 1, bottom: "8vh", transform: "translateX(-50%)" }}
        >
          <span className="caption__kicker">prototype</span>
          <h2 className="caption__title" style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)" }}>
            Earth → Southeast Asia → City
          </h2>
          <p className="caption__body">Scroll to descend. (zoom-in intro POC)</p>
        </div>
      </div>
    </div>
  );
}
