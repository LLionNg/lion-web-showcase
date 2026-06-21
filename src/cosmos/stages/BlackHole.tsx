import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { clamp01, lerp, smoothstep } from "../util";
import blackholeFrag from "../shaders/blackhole.frag.glsl?raw";

// Realtime ray-traced black hole (gravitational lensing + accretion disk),
// ported from github.com/kavik/threejs-blackhole (Apache-2.0 / MIT). It renders
// full-screen in clip space and lenses the Milky Way background, so the whole
// Sagittarius A* stage reads as "inside the galaxy, looking at the black hole".

// Full-screen clip-space plane: the fragment shader does all the work.
const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

// Ray-march quality (step size / max steps). Lower NSTEPS = faster.
const defines = `#define STEP 0.1\n#define NSTEPS 300\n`;

// Smaller lensed background on touch: the full Milky Way is 4096x2048 (~34 MB
// decoded) - too much to hold alongside the globe's WebGL context on iOS, where
// it contributed to the tab being killed. The bg is heavily lensed anyway.
const IS_TOUCH =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;
const MILKYWAY_TEX = IS_TOUCH
  ? "/textures/milkyway_2048.jpg"
  : "/textures/milkyway.jpg";

export default function BlackHole({
  start,
  end,
}: {
  start: number;
  end: number;
}) {
  const scroll = useScroll();
  const [bg, star, disk] = useTexture([
    MILKYWAY_TEX,
    "/textures/star_noise.png",
    "/textures/accretion_disk.png",
  ]);

  // Wrapping/filtering as the source project expects.
  bg.wrapS = THREE.RepeatWrapping;
  bg.wrapT = THREE.ClampToEdgeWrapping;
  bg.minFilter = bg.magFilter = THREE.LinearFilter;
  star.wrapS = star.wrapT = THREE.ClampToEdgeWrapping;
  disk.wrapS = THREE.RepeatWrapping;
  disk.wrapT = THREE.ClampToEdgeWrapping;

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(1, 1) },
      cam_pos: { value: new THREE.Vector3() },
      cam_dir: { value: new THREE.Vector3() },
      cam_up: { value: new THREE.Vector3(0, 1, 0) },
      fov: { value: 60 },
      cam_vel: { value: new THREE.Vector3() },
      accretion_disk: { value: true },
      use_disk_texture: { value: true },
      lorentz_transform: { value: false },
      doppler_shift: { value: false },
      beaming: { value: false },
      bg_texture: { value: bg },
      star_texture: { value: star },
      disk_texture: { value: disk },
      uOpacity: { value: 0 }, // driven by the parent Stage
    }),
    [bg, star, disk],
  );

  const fragmentShader = useMemo(() => defines + blackholeFrag, []);

  // Slow orbit around the hole, slightly inclined for the disk-over-top look.
  const incline = useMemo(() => new THREE.Matrix4().makeRotationX(-0.16), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const theta = useRef(0.6);

  useFrame((state, dt) => {
    uniforms.time.value += dt;
    state.gl.getDrawingBufferSize(uniforms.resolution.value);

    // Progress through this stage's scroll window.
    const local = clamp01((scroll.offset - start) / (end - start));
    // Fade in/out with the journey.
    uniforms.uOpacity.value =
      smoothstep(0, 0.3, local) * (1 - smoothstep(0.7, 1, local));
    // "Zoom out": pull the shader camera back as we scroll through, so the
    // hole shrinks and we pull away toward the galaxy scale.
    const r = lerp(8, 24, smoothstep(0, 1, local));

    theta.current += dt * 0.04; // slow orbit for life
    pos
      .set(r * Math.sin(theta.current), 0, r * Math.cos(theta.current))
      .applyMatrix4(incline);
    uniforms.cam_pos.value.copy(pos);
    uniforms.cam_dir.value.copy(pos).negate().normalize();
  });

  return (
    <mesh frustumCulled={false} renderOrder={20}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
