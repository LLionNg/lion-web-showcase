import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { prefersReducedMotion } from "../util";
import { DBG } from "../debug";

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vEye)), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f);
  }
`;

export default function Earth() {
  const [day, normal, clouds, moon] = useTexture([
    "/textures/earth_atmos_2048.jpg",
    "/textures/earth_normal_2048.jpg",
    "/textures/earth_clouds_1024.png",
    "/textures/moon_1024.jpg",
  ]);
  day.colorSpace = THREE.SRGBColorSpace;
  moon.colorSpace = THREE.SRGBColorSpace;

  // Anisotropic filtering kills the surface "sparkle"/shimmer that detailed
  // textures show under motion near the limb and poles.
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  for (const t of [day, normal, clouds, moon]) {
    if (t.anisotropy !== maxAniso) {
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
    }
  }

  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudRef = useRef<THREE.Mesh>(null!);
  const moonRef = useRef<THREE.Group>(null!);

  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#4ea6ff") },
      uPower: { value: 3.0 },
      uIntensity: { value: 1.1 },
    }),
    [],
  );

  useFrame((_, dt) => {
    if (prefersReducedMotion || DBG.noSpin) return;
    earthRef.current.rotation.y += dt * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.055;
    moonRef.current.rotation.y += dt * 0.06;
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 96, 96]} />
        {DBG.flatEarth ? (
          <meshBasicMaterial map={day} />
        ) : (
          <meshStandardMaterial
            map={day}
            normalMap={DBG.noNormal ? undefined : normal}
            // Gentler normals + fully matte: no crawling specular highlights as
            // the camera parallaxes (the main Earth-only shimmer source).
            normalScale={new THREE.Vector2(0.4, 0.4)}
            roughness={1}
            metalness={0}
          />
        )}
      </mesh>

      {/* Clouds — lifted clear of the surface, depth-biased toward the camera
          (polygonOffset) and never writing depth, so they can't z-fight the
          globe as the camera parallaxes. */}
      {!DBG.noClouds && (
        <mesh ref={cloudRef} scale={1.04} renderOrder={1}>
          <sphereGeometry args={[2, 80, 80]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.9}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
            roughness={1}
          />
        </mesh>
      )}

      {/* Atmosphere rim glow */}
      <mesh scale={1.16}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={atmosphereUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Moon */}
      <group ref={moonRef}>
        <mesh position={[4.2, 0.6, -1.5]}>
          <sphereGeometry args={[0.45, 48, 48]} />
          <meshStandardMaterial map={moon} roughness={0.95} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}
