import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { clamp01, prefersReducedMotion, smoothstep } from "../util";

interface PlanetDef {
  name: string;
  r: number; // orbit radius
  size: number; // planet radius
  tex: string; // surface texture map
  speed: number; // orbital angular speed
  phase: number; // starting angle
  ring?: boolean; // Saturn's rings
}

// All eight planets, in order. Sizes are log-compressed (gas giants larger)
// and orbit radii compressed so the whole system frames nicely. Textures are
// 512px CC BY 4.0 maps from solarsystemscope.com (Earth reuses its hero map).
const PLANETS: PlanetDef[] = [
  { name: "Mercury", r: 0.58, size: 0.035, tex: "/textures/planets/mercury.jpg", speed: 0.42, phase: 0.6 },
  { name: "Venus", r: 0.82, size: 0.055, tex: "/textures/planets/venus.jpg", speed: 0.32, phase: 2.2 },
  { name: "Earth", r: 1.05, size: 0.058, tex: "/textures/earth_atmos_2048.jpg", speed: 0.26, phase: 0.2 },
  { name: "Mars", r: 1.34, size: 0.042, tex: "/textures/planets/mars.jpg", speed: 0.21, phase: 3.5 },
  { name: "Jupiter", r: 1.85, size: 0.15, tex: "/textures/planets/jupiter.jpg", speed: 0.13, phase: 1.1 },
  { name: "Saturn", r: 2.25, size: 0.12, tex: "/textures/planets/saturn.jpg", speed: 0.1, phase: 5.0, ring: true },
  { name: "Uranus", r: 2.55, size: 0.085, tex: "/textures/planets/uranus.jpg", speed: 0.075, phase: 2.6 },
  { name: "Neptune", r: 2.82, size: 0.082, tex: "/textures/planets/neptune.jpg", speed: 0.06, phase: 4.3 },
];
const EARTH_INDEX = 2;
const SATURN_INDEX = 5;

export default function SolarSystem({
  start,
  end,
}: {
  start: number;
  end: number;
}) {
  const scroll = useScroll();
  const maps = useTexture(PLANETS.map((p) => p.tex));
  const sunTex = useTexture("/textures/planets/sun.jpg");
  const ringTex = useTexture("/textures/planets/saturn_ring.png");
  for (const m of maps) m.colorSpace = THREE.SRGBColorSpace;
  sunTex.colorSpace = THREE.SRGBColorSpace;
  ringTex.colorSpace = THREE.SRGBColorSpace;

  // Saturn's ring as a textured disk with radial UVs, so the strip texture
  // maps inner→outer across the ring's radius (with its alpha gaps).
  const ringGeo = useMemo(() => {
    const s = PLANETS[SATURN_INDEX].size;
    const inner = s * 1.3;
    const outer = s * 2.3;
    const g = new THREE.RingGeometry(inner, outer, 96, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, []);

  const panRef = useRef<THREE.Group>(null!);
  const orbitRefs = useRef<(THREE.Group | null)[]>([]);
  const tRef = useRef(0);

  const tilt = useMemo(() => new THREE.Euler(0.42, 0, 0.06), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (!prefersReducedMotion) tRef.current += dt;
    const tt = tRef.current;

    for (let i = 0; i < PLANETS.length; i++) {
      const g = orbitRefs.current[i];
      if (g) g.rotation.y = PLANETS[i].phase + tt * PLANETS[i].speed;
    }

    // Anchor on Earth as the stage enters — so the dot Earth lands where the
    // big Earth shrank to — then release toward a Sun-centred overview as the
    // viewer scrolls out, reading as "pulling back from Earth".
    const local = clamp01((scroll.offset - start) / (end - start));
    const blend = 1 - smoothstep(0.0, 0.55, local);
    const e = PLANETS[EARTH_INDEX];
    const ea = e.phase + tt * e.speed;
    tmp
      .set(Math.cos(ea) * e.r, 0, -Math.sin(ea) * e.r)
      .applyEuler(tilt)
      .multiplyScalar(-blend);
    if (panRef.current) panRef.current.position.copy(tmp);
  });

  return (
    <group ref={panRef}>
      <group rotation={tilt}>
        {/* Sun — textured surface, kept bright/unlit. */}
        <mesh>
          <sphereGeometry args={[0.4, 48, 48]} />
          <meshBasicMaterial map={sunTex} color="#fff6e0" toneMapped={false} />
        </mesh>

        {PLANETS.map((p, i) => (
          <group key={p.name}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[p.r - 0.004, p.r + 0.004, 200]} />
              <meshBasicMaterial
                color="#33507a"
                side={THREE.DoubleSide}
                transparent
                opacity={0.32}
                depthWrite={false}
              />
            </mesh>

            <group
              ref={(el) => {
                orbitRefs.current[i] = el;
              }}
            >
              <group position={[p.r, 0, 0]}>
                <mesh>
                  <sphereGeometry args={[p.size, 32, 32]} />
                  <meshStandardMaterial
                    map={maps[i]}
                    // A little self-illumination from the same map keeps the
                    // night side readable on these tiny spheres.
                    emissiveMap={maps[i]}
                    emissive="#ffffff"
                    emissiveIntensity={0.18}
                    roughness={0.9}
                    metalness={0}
                  />
                </mesh>
                {/* Saturn's rings (textured, with real gaps via alpha). */}
                {p.ring && (
                  <mesh
                    geometry={ringGeo}
                    rotation={[-Math.PI / 2 + 0.45, 0, 0.2]}
                  >
                    <meshBasicMaterial
                      map={ringTex}
                      side={THREE.DoubleSide}
                      transparent
                      depthWrite={false}
                      toneMapped={false}
                    />
                  </mesh>
                )}
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
