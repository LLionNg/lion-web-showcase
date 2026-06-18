import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { radialSprite } from "../textures";
import { prefersReducedMotion } from "../util";

// The final scale: thousands of distant galaxies scattered through space,
// each a soft mote of light, drifting slowly — the observable universe.
export default function Universe() {
  const sprite = useMemo(
    () => radialSprite("rgba(255,255,255,1)", "rgba(200,210,255,0.4)"),
    [],
  );
  const ref = useRef<THREE.Points>(null!);

  const { positions, colors } = useMemo(() => {
    const count = 5000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#fff3d6"),
      new THREE.Color("#cdd9ff"),
      new THREE.Color("#ffd0e0"),
      new THREE.Color("#bafff0"),
      new THREE.Color("#ffe0b0"),
    ];
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Fill from near the centre outward (no hollow core) so the shrinking
      // Milky Way recedes into a field of galaxies rather than an empty void.
      const r = 0.5 + Math.pow(Math.random(), 0.8) * 11;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);
      const c = palette[(Math.random() * palette.length) | 0];
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((_, dt) => {
    if (prefersReducedMotion) return;
    ref.current.rotation.y += dt * 0.015;
    ref.current.rotation.x += dt * 0.006;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        map={sprite}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}
