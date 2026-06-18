import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ScrollControls, useScroll, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { lerp, smoothstep } from "../cosmos/util";

/**
 * PROTOTYPE — zoom-in intro: Earth (night) → SE Asia → a neon cyberpunk city.
 * City geometry/textures are a subset of SynthCity (jeffbeene/synthcity, MIT),
 * re-textured with the same recipe (diffuse + emissive window map + a random
 * neon tint) and lit by bloom. View at /?proto.
 */

const MODEL_URLS = [
  "/models/city/s_01_01.obj", // 0 short
  "/models/city/s_02_02.obj", // 1 short
  "/models/city/s_03_01.obj", // 2 mid
  "/models/city/s_04_01.obj", // 3 tall
  "/models/city/s_04_03.obj", // 4 tall
  "/models/city/s_05_01.obj", // 5 tower
  "/models/city/s_05_02.obj", // 6 tower
];
const TEX_SETS = [
  ["/textures/city/building_01.jpg", "/textures/city/building_01_em.jpg"],
  ["/textures/city/building_02.jpg", "/textures/city/building_02_em.jpg"],
  ["/textures/city/building_03.jpg", "/textures/city/building_03_em.jpg"],
  ["/textures/city/building_04.jpg", "/textures/city/building_04_em.jpg"],
];
const NEON = [
  "#ff3df0",
  "#a05cff",
  "#4f7bff",
  "#28e0ff",
  "#ff5fa8",
  "#7af0ff",
  "#ff8a3d",
];

// Normalise a loaded OBJ into a single geometry whose footprint is ~1 unit and
// whose base sits at y=0, plus the natural height:footprint ratio.
function processObj(group: THREE.Object3D) {
  const geos: THREE.BufferGeometry[] = [];
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      if (!g.attributes.uv) g.setAttribute("uv", g.attributes.position); // fallback
      geos.push(g);
    }
  });
  let geo = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
  if (!geo) geo = new THREE.BoxGeometry(1, 2, 1);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  geo.translate(
    -(bb.min.x + bb.max.x) / 2,
    -bb.min.y,
    -(bb.min.z + bb.max.z) / 2,
  );
  const footprint = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
  geo.computeVertexNormals();
  return { geo, norm: 1 / footprint };
}

interface Placement {
  x: number;
  z: number;
  model: number;
  mat: number;
  norm: number;
  hMul: number;
  rotY: number;
}

function NeonCity() {
  const scroll = useScroll();
  const objs = useLoader(OBJLoader, MODEL_URLS);
  const texs = useTexture(TEX_SETS.flat());
  const groupRef = useRef<THREE.Group>(null!);

  const models = useMemo(() => objs.map((o) => processObj(o)), [objs]);

  // Material pool: each building texture × a few neon tints.
  const materials = useMemo(() => {
    for (const t of texs) t.colorSpace = THREE.SRGBColorSpace;
    const pool: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < TEX_SETS.length; i++) {
      const map = texs[i * 2];
      const em = texs[i * 2 + 1];
      for (let n = 0; n < 3; n++) {
        pool.push(
          new THREE.MeshStandardMaterial({
            map,
            emissiveMap: em,
            emissive: new THREE.Color(
              NEON[(Math.random() * NEON.length) | 0],
            ),
            emissiveIntensity: 2.4,
            roughness: 0.7,
            metalness: 0.2,
            transparent: true,
          }),
        );
      }
    }
    return pool;
  }, [texs]);

  const placements = useMemo<Placement[]>(() => {
    const arr: Placement[] = [];
    const N = 26;
    const spacing = 0.55;
    for (let ix = 0; ix < N; ix++) {
      for (let iz = 0; iz < N; iz++) {
        if (Math.random() < 0.18) continue; // street gaps
        const x = (ix - N / 2) * spacing + (Math.random() - 0.5) * 0.12;
        const z = (iz - N / 2) * spacing + (Math.random() - 0.5) * 0.12;
        const dist = Math.hypot(x, z);
        let model: number;
        let hMul: number;
        if (dist < 2.4) {
          model = Math.random() < 0.5 ? 5 : 6; // towers
          hMul = 1.2 + Math.random() * 1.4;
        } else if (dist < 4.6) {
          model = Math.random() < 0.5 ? 3 : 4; // tall
          hMul = 0.8 + Math.random() * 0.9;
        } else {
          model = (Math.random() * 3) | 0; // short
          hMul = 0.5 + Math.random() * 0.6;
        }
        arr.push({
          x,
          z,
          model,
          mat: (Math.random() * materials.length) | 0,
          norm: models[model].norm,
          hMul,
          rotY: ((Math.random() * 4) | 0) * (Math.PI / 2),
        });
      }
    }
    return arr;
  }, [models, materials]);

  useFrame(() => {
    const op = smoothstep(0.45, 0.85, scroll.offset);
    groupRef.current.visible = op > 0.001;
    for (const m of materials) m.opacity = op;
  });

  return (
    <group ref={groupRef} visible={false}>
      {placements.map((b, i) => (
        <mesh
          key={i}
          geometry={models[b.model].geo}
          material={materials[b.mat]}
          position={[b.x, 0, b.z]}
          scale={[b.norm, b.norm * b.hMul, b.norm]}
          rotation={[0, b.rotY, 0]}
        />
      ))}
    </group>
  );
}

// Earth night-lights side, rotated toward SE Asia; fades as we drop in.
function NightEarth() {
  const scroll = useScroll();
  const tex = useTexture("/textures/earth_night_2048.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(() => {
    const o = scroll.offset;
    ref.current.scale.setScalar(lerp(1, 1.8, smoothstep(0, 0.6, o)));
    const op = 1 - smoothstep(0.36, 0.58, o);
    matRef.current.opacity = op;
    ref.current.visible = op > 0.001;
  });
  return (
    <group ref={ref} rotation={[0.42, -1.95, 0]}>
      <mesh>
        <sphereGeometry args={[2, 96, 96]} />
        <meshBasicMaterial ref={matRef} map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

// Camera descends from "whole Earth" to a low neon-skyline aerial.
function CameraRig() {
  const scroll = useScroll();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const o = smoothstep(0, 1, scroll.offset);
    state.camera.position.set(0, lerp(0, 3.4, o), lerp(6, 9, o));
    target.set(0, lerp(0, 1.5, o), 0);
    state.camera.lookAt(target);
  });
  return null;
}

function Ground() {
  const scroll = useScroll();
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(() => {
    matRef.current.opacity = smoothstep(0.45, 0.85, scroll.offset) * 0.9;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial ref={matRef} color="#0a0820" transparent />
    </mesh>
  );
}

export default function CityZoom() {
  return (
    <div className="app">
      <Canvas
        className="canvas"
        frameloop="always"
        camera={{ position: [0, 0, 6], fov: 55, near: 0.1, far: 120 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <color attach="background" args={["#0b0a24"]} />
        <fogExp2 attach="fog" args={["#160f3a", 0.045]} />
        <ambientLight intensity={0.18} />
        <directionalLight position={[3, 6, 4]} intensity={0.3} color="#6a78ff" />
        <Suspense fallback={null}>
          <ScrollControls pages={4} damping={0.3}>
            <CameraRig />
            <NightEarth />
            <Ground />
            <NeonCity />
          </ScrollControls>
        </Suspense>

        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <div className="overlay" aria-hidden="true">
        <div
          className="caption"
          style={{ opacity: 1, bottom: "8vh", transform: "translateX(-50%)" }}
        >
          <span className="caption__kicker">prototype</span>
          <h2
            className="caption__title"
            style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)" }}
          >
            Earth → Southeast Asia → Neon City
          </h2>
          <p className="caption__body">Scroll to descend. (SynthCity kit, MIT)</p>
        </div>
      </div>
    </div>
  );
}
