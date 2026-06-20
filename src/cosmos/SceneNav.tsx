import { useEffect, useRef, useState } from "react";
import { scrollState } from "./progress";
import { SCENES, EARTH_SCENE_INDEX, currentSceneIndex } from "./scenes";

// Fraction of the viewport height at the top / bottom that acts as a tap zone.
const ZONE = 0.18;

/**
 * Dynamic scene navigation. Shows the adjacent scenes as blended labels at the
 * top (zoom in / previous) and bottom (zoom out / next) of whatever scene you're
 * on, and turns the full-width strips at those edges into tap targets that smooth
 * -scroll to that scene. Tapping is detected globally (a quick press-release with
 * little movement) so it never steals the globe's drag-to-orbit or the cosmos's
 * swipe-to-scroll — those move the pointer and are ignored here.
 */
export default function SceneNav({
  active,
  earthActive,
  onNavigate,
}: {
  active: boolean;
  earthActive: boolean;
  onNavigate: (id: string) => void;
}) {
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // The cosmos sub-scene follows the live scroll offset (rAF). The Earth/cosmos
  // switch is driven directly by the `earthActive` prop, so that flip is instant
  // and doesn't wait for a frame.
  const [cosmosIdx, setCosmosIdx] = useState(() =>
    currentSceneIndex(false, scrollState.offset),
  );
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const next = currentSceneIndex(false, scrollState.offset);
      setCosmosIdx((cur) => (cur === next ? cur : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const idx = earthActive ? EARTH_SCENE_INDEX : cosmosIdx;
  const prev = idx > 0 ? SCENES[idx - 1] : null;
  const next = idx < SCENES.length - 1 ? SCENES[idx + 1] : null;
  const prevRef = useRef(prev);
  prevRef.current = prev;
  const nextRef = useRef(next);
  nextRef.current = next;

  // Dev hook for verifying the scene mapping from the preview console.
  if (import.meta.env.DEV)
    (window as unknown as { __sceneNav?: unknown }).__sceneNav = {
      idx,
      prev: prev?.id,
      next: next?.id,
      currentSceneIndex,
      scrollState,
      SCENES,
    };

  // Global tap detection. A tap = press + release within ~450ms and <12px of
  // movement; anything more is a drag/swipe and passes straight through.
  useEffect(() => {
    if (!active) return;
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const held = performance.now() - down.t;
      down = null;
      if (moved > 12 || held > 450) return; // drag / swipe / long-press
      // Let real controls (Enter Portfolio, Return, links) handle their own taps.
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" && t.closest("button, a, input, textarea"))
        return;
      const h = window.innerHeight;
      if (e.clientY <= h * ZONE && prevRef.current)
        onNavigateRef.current(prevRef.current.id);
      else if (e.clientY >= h * (1 - ZONE) && nextRef.current)
        onNavigateRef.current(nextRef.current.id);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="scene-nav" aria-hidden="true">
      {prev && (
        <div className="scene-zone scene-zone--top">
          <span className="scene-zone__chev">↑</span>
          <span className="scene-zone__label">{prev.label}</span>
        </div>
      )}
      {next && (
        <div className="scene-zone scene-zone--bottom">
          <span className="scene-zone__label">{next.label}</span>
          <span className="scene-zone__chev">↓</span>
        </div>
      )}
    </div>
  );
}
