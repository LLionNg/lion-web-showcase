import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { radialSprite } from "../textures";
import { prefersReducedMotion } from "../util";

// A full spiral galaxy: the classic procedural arms with a warm core fading
// to cool blue rim, plus a glowing nucleus.
export default function Galaxy() {
  const sprite = useMemo(() => radialSprite(), []);
  const coreGlow = useMemo(
    () => radialSprite("rgba(255,240,210,1)", "rgba(255,200,120,0.4)"),
    [],
  );
  const ref = useRef<THREE.Points>(null!);

  const { positions, colors } = useMemo(() => {
    const count = 16000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const inside = new THREE.Color("#ffb066");
    const outside = new THREE.Color("#3b6fff");
    const arms = 5;
    const radius = 4.2;
    const spin = 1.15;
    const randomness = 0.42;
    const randomPow = 2.6;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 1.4) * radius;
      const branch = ((i % arms) / arms) * Math.PI * 2;
      const spinAngle = r * spin;
      const rx =
        Math.pow(Math.random(), randomPow) *
        (Math.random() < 0.5 ? 1 : -1) *
        randomness *
        r;
      const ry =
        Math.pow(Math.random(), randomPow) *
        (Math.random() < 0.5 ? 1 : -1) *
        randomness *
        r *
        0.35;
      const rz =
        Math.pow(Math.random(), randomPow) *
        (Math.random() < 0.5 ? 1 : -1) *
        randomness *
        r;
      pos[i3] = Math.cos(branch + spinAngle) * r + rx;
      pos[i3 + 1] = ry;
      pos[i3 + 2] = Math.sin(branch + spinAngle) * r + rz;
      const c = inside.clone().lerp(outside, r / radius);
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((_, dt) => {
    if (prefersReducedMotion) return;
    ref.current.rotation.y += dt * 0.08;
  });

  return (
    <group rotation={[1.0, 0, 0.25]}>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          map={sprite}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
      <sprite scale={[1.8, 1.8, 1]}>
        <spriteMaterial
          map={coreGlow}
          color="#ffe8c0"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
