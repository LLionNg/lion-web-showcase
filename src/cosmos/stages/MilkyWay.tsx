import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { radialSprite } from "../textures";
import { prefersReducedMotion } from "../util";

// Star colours scattered through the band & field — white-heavy, with blue,
// cyan, faded pink and warm gold so it reads colourful like the real sky.
const STAR_PALETTE = [
  "#ffffff",
  "#ffffff",
  "#ffffff",
  "#fff4e0",
  "#cfe0ff",
  "#9db8ff",
  "#7f9dff",
  "#a8e8ff",
  "#bff2ff",
  "#ffc7d8",
  "#ffb3c6",
  "#ffd9a0",
  "#ffcf8a",
].map((h) => new THREE.Color(h));
const DUST = new THREE.Color("#ffcf94");

const pickStar = () =>
  STAR_PALETTE[(Math.random() * STAR_PALETTE.length) | 0];

// "Into the Milky Way" — the galactic plane seen from within: a dense band of
// stars with a warm glowing bulge at the centre, fading to blue-white toward
// the edges, over a full starfield.
export default function MilkyWay() {
  const starSprite = useMemo(() => radialSprite(), []);
  const glowSprite = useMemo(
    () => radialSprite("rgba(255,224,170,0.9)", "rgba(255,180,110,0.25)"),
    [],
  );
  const groupRef = useRef<THREE.Group>(null!);

  // Dense galactic band: stars concentrated along a thin plane, warm at the
  // bulge (centre) fading to blue-white toward the ends.
  const band = useMemo(() => {
    const count = 15000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const side = Math.random() < 0.5 ? -1 : 1;
      const along = Math.pow(Math.random(), 1.7) * side; // -1..1, dense near 0
      const bulge = 1 - Math.abs(along);
      const thickness = 0.3 + bulge * 0.9; // band fattens at the bulge
      const gy = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      pos[i3] = along * 9;
      pos[i3 + 1] = gy * thickness;
      pos[i3 + 2] = (Math.random() * 2 - 1) * 5;
      // A varied palette star, warm-dust-tinted toward the bulge; brightest
      // near the centre.
      tmp.copy(pickStar()).lerp(DUST, bulge * 0.5);
      const b = 0.45 + bulge * 0.6 + 0.3 * Math.random();
      col[i3] = tmp.r * b;
      col[i3 + 1] = tmp.g * b;
      col[i3 + 2] = tmp.b * b;
    }
    return { pos, col };
  }, []);

  // Sparse general star field filling the rest of the sky.
  const field = useMemo(() => {
    const count = 5000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = 6 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);
      tmp.copy(pickStar());
      const b = 0.25 + 0.45 * Math.random();
      col[i3] = tmp.r * b;
      col[i3 + 1] = tmp.g * b;
      col[i3 + 2] = tmp.b * b;
    }
    return { pos, col };
  }, []);

  useFrame((_, dt) => {
    if (prefersReducedMotion) return;
    groupRef.current.rotation.z += dt * 0.005; // very slow drift
  });

  return (
    <group ref={groupRef} rotation={[0.12, 0, 0.42]}>
      {/* Galactic band */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[band.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[band.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          map={starSprite}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* General star field */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[field.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[field.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          map={starSprite}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* Warm bulge glow at the galactic centre. */}
      <sprite scale={[4, 2.6, 1]}>
        <spriteMaterial
          map={glowSprite}
          color="#ffce88"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </sprite>
      <sprite scale={[2, 1.5, 1]}>
        <spriteMaterial
          map={glowSprite}
          color="#fff0d0"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
