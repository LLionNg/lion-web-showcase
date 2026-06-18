import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";
import { stageState, type StageConfig } from "./util";

interface StageProps extends StageConfig {
  /**
   * Depth offset along the camera axis. Later (larger) scales sit further
   * back so an overlapping cross-fade can't z-fight with the scale in front,
   * and three's distance sort draws the nearer scale on top automatically.
   */
  z?: number;
  children: ReactNode;
}

/**
 * Wraps one cosmic scale. Reads the global scroll offset every frame and
 * drives the group's scale + every child material's opacity so the scale
 * fades and recedes as the viewer travels outward.
 */
export default function Stage({ children, z = 0, ...config }: StageProps) {
  const ref = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame(() => {
    const { opacity, scale } = stageState(scroll.offset, config);
    const group = ref.current;
    if (!group) return;

    group.scale.setScalar(scale);
    group.visible = opacity > 0.002;
    if (!group.visible) return;

    group.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (!mat) return;
      const apply = (m: THREE.Material) => {
        // Remember each material's authored blend state once so the logic
        // below is reversible when the viewer scrolls back up.
        const ud = m.userData as { _t?: boolean; _dw?: boolean };
        if (ud._t === undefined) {
          ud._t = m.transparent;
          ud._dw = m.depthWrite;
        }
        const fading = opacity < 0.999;
        // Stay opaque (and depth-writing) at full strength so a solid sphere
        // never shimmers; only blend + stop writing depth during a hand-off,
        // which is what was z-fighting the neighbouring scale.
        m.transparent = ud._t || fading;
        m.depthWrite = ud._dw! && !fading;
        m.opacity = opacity;
        // Raw ShaderMaterials ignore `opacity`; if one exposes a `uOpacity`
        // uniform, drive it with the same stage opacity so it fades too.
        const sm = m as THREE.ShaderMaterial;
        if (sm.uniforms && sm.uniforms.uOpacity) {
          sm.uniforms.uOpacity.value = opacity;
        }
      };
      Array.isArray(mat) ? mat.forEach(apply) : apply(mat);
    });
  });

  return (
    <group ref={ref} position-z={z}>
      {children}
    </group>
  );
}
