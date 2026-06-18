import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../util";

// Fresnel rim glow (warm) — the bright edge hugging the event horizon.
const glowVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const glowFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  uniform float uOpacity;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vEye)), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f * uOpacity);
  }
`;

// Shared vertex shader for the flat ring geometries: hand the local radial
// coordinate (XY of the un-rotated ring) to the fragment shader.
const ringVertex = /* glsl */ `
  varying vec2 vXY;
  void main() {
    vXY = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Accretion disk: white-hot inner edge → amber → deep red, with swirling
// streaks that drift over time so it reads as orbiting plasma.
const diskFragment = /* glsl */ `
  precision highp float;
  varying vec2 vXY;
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  uniform float uOpacity;
  void main() {
    float r = length(vXY);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float ang = atan(vXY.y, vXY.x);

    // Two overlaid swirl bands for a turbulent, filamentary look.
    float streak = 0.55 + 0.45 * sin(ang * 50.0 - uTime * 1.6 - r * 5.0);
    streak *= 0.6 + 0.4 * sin(ang * 13.0 + uTime * 0.7 - r * 2.0);

    vec3 hot   = vec3(1.0, 0.96, 0.88);
    vec3 amber = vec3(1.0, 0.55, 0.18);
    vec3 deep  = vec3(0.55, 0.08, 0.02);
    vec3 col = mix(hot, amber, smoothstep(0.0, 0.4, t));
    col = mix(col, deep, smoothstep(0.45, 1.0, t));

    // Soft inner edge, fade out toward the rim, brighter near the hole.
    float a = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.6, 1.0, t));
    a *= mix(0.5, 1.0, streak);
    a *= (1.25 - t);
    gl_FragColor = vec4(col * (1.15 + 0.7 * streak), a * uOpacity);
  }
`;

export default function SagittariusA() {
  const rimUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#ffe6c2") },
      uPower: { value: 3.4 },
      uIntensity: { value: 1.9 },
      uOpacity: { value: 0 },
    }),
    [],
  );
  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uInner: { value: 0.72 },
      uOuter: { value: 2.6 },
      uOpacity: { value: 0 },
    }),
    [],
  );
  // uOpacity on each shader is driven by the parent Stage so these fade with
  // the rest of the scene (raw shaders ignore material.opacity).
  useFrame((_, dt) => {
    if (!prefersReducedMotion) diskUniforms.uTime.value += dt;
  });

  return (
    <group rotation={[0.16, 0, 0]}>
      {/* Event horizon */}
      <mesh>
        <sphereGeometry args={[0.6, 64, 64]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      {/* Warm rim glow hugging the event horizon. */}
      <mesh scale={1.16}>
        <sphereGeometry args={[0.6, 64, 64]} />
        <shaderMaterial
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={rimUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Near edge-on accretion disk — opened a few degrees off perfect
          edge-on so it renders as a clear thin glowing line rather than a
          degenerate (invisible) razor edge. Occluded behind the horizon on
          its far side. */}
      <mesh rotation={[Math.PI / 2 - 0.28, 0, 0]}>
        <ringGeometry args={[0.72, 2.6, 240, 8]} />
        <shaderMaterial
          vertexShader={ringVertex}
          fragmentShader={diskFragment}
          uniforms={diskUniforms}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
