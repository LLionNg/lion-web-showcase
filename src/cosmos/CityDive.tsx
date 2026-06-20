import { useEffect, useRef, useState } from "react";
import { SynthCityScene } from "../proto/synthcity/scene";

/**
 * Cinematic descent through the neon city, between the Earth globe and the
 * portfolio. Drives the prototype's SynthCityScene (vanilla three, unchanged)
 * from above the skyline down into the streets over a fixed duration, then hands
 * off to the portfolio. The scene loads its own ~OBJ city + textures on mount; a
 * dark backdrop (in App) covers that load until the canvas fades in.
 */
const CITY_MS = 4000; // descent duration
const HOLD_MS = 300; // let the camera settle at the bottom before the hand-off

export default function CityDive({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: SynthCityScene | null = null;
    let raf = 0;
    let cancelled = false;
    let done = false;
    let start = 0;
    const onResize = () => scene?.resize();

    const loop = (t: number) => {
      if (cancelled) return;
      if (!start) start = t;
      const p = Math.min(1, (t - start) / CITY_MS);
      scene?.setProgress(p); // the scene damps this internally for a smooth glide
      if (p >= 1 && !done) {
        done = true;
        window.setTimeout(() => !cancelled && onCompleteRef.current(), HOLD_MS);
      }
      raf = requestAnimationFrame(loop);
    };

    void (async () => {
      scene = new SynthCityScene(canvas);
      await scene.init();
      if (cancelled) {
        scene.dispose();
        scene = null;
        return;
      }
      setReady(true);
      window.addEventListener("resize", onResize);
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      setReady(false);
      scene?.dispose();
      scene = null;
    };
  }, [active]);

  return (
    <div className="city-dive" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className={`city-dive__canvas${ready ? " is-ready" : ""}`}
      />
    </div>
  );
}
