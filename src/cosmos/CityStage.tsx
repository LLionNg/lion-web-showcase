import { useEffect, useRef, useState } from "react";
import { SynthCityScene } from "../proto/synthcity/scene";

/**
 * User-controlled neon-city stage between the Earth globe and the portfolio.
 * A transparent scroll surface drives the prototype's SynthCityScene (unchanged)
 * from above the skyline down into the streets — the user controls the descent
 * (wheel / trackpad / touch). Pushing past the top hands back to Earth; pushing
 * past the bottom hands off to the portfolio. A caption fades in mid-descent.
 */
export default function CityStage({
  active,
  enterFrom,
  onExitToEarth,
  onExitToPortfolio,
}: {
  active: boolean;
  enterFrom: "earth" | "portfolio";
  onExitToEarth: () => void;
  onExitToPortfolio: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const exitEarthRef = useRef(onExitToEarth);
  exitEarthRef.current = onExitToEarth;
  const exitPortfolioRef = useRef(onExitToPortfolio);
  exitPortfolioRef.current = onExitToPortfolio;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const scrollEl = scrollRef.current;
    const caption = captionRef.current;
    if (!canvas || !scrollEl) return;
    let scene: SynthCityScene | null = null;
    let cancelled = false;
    let exited = false;
    let armed = false; // boundary hand-offs arm after the entry gesture settles
    let overscroll = 0;

    const onResize = () => scene?.resize();
    const max = () => scrollEl.scrollHeight - scrollEl.clientHeight;
    const nearTop = () => scrollEl.scrollTop <= 4;
    const nearBottom = () => scrollEl.scrollTop >= max() - 4;

    const update = () => {
      const m = max();
      // Invert: scrolling UP descends deeper into the city, so the zoom matches
      // the globe's "scroll up = zoom in" direction (not inverted between them).
      const p = m > 0 ? 1 - scrollEl.scrollTop / m : 0;
      scene?.setProgress(p); // the scene damps this internally
      if (caption) {
        const vis = Math.min(1, Math.max(0, 1 - Math.abs(p - 0.5) / 0.32));
        caption.style.opacity = vis.toFixed(3);
      }
    };
    const onScroll = () => {
      update();
      overscroll = 0; // any in-range scroll cancels a pending hand-off
    };

    // Push past an end to hand off. With the inverted mapping scrollTop 0 is the
    // streets (deepest) and scrollTop max is the sky (highest): keep scrolling UP
    // at the streets -> portfolio; keep scrolling DOWN at the sky -> Earth.
    // Accumulated so it takes a deliberate push, not a stray tick.
    const pushOut = (dir: number, amount: number, threshold: number) => {
      if (exited || !armed) return;
      if (dir < 0 && nearTop()) {
        overscroll += amount;
        if (overscroll > threshold) {
          exited = true;
          exitPortfolioRef.current();
        }
      } else if (dir > 0 && nearBottom()) {
        overscroll += amount;
        if (overscroll > threshold) {
          exited = true;
          exitEarthRef.current();
        }
      } else {
        overscroll = 0;
      }
    };
    const onWheel = (e: WheelEvent) =>
      pushOut(e.deltaY, Math.abs(e.deltaY), 200);
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      const d = ty - y; // finger up (>0) = scroll down; finger down (<0) = up
      ty = y;
      pushOut(d, Math.abs(d), 90);
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    scrollEl.addEventListener("wheel", onWheel, { passive: true });
    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: true });

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
      // Earth enters at the sky (scrollTop max = progress 0); the portfolio
      // enters at the streets (scrollTop 0 = progress 1).
      scrollEl.scrollTop = enterFrom === "portfolio" ? 0 : max();
      update();
      window.setTimeout(() => {
        if (!cancelled) armed = true;
      }, 550);
    })();

    return () => {
      cancelled = true;
      scrollEl.removeEventListener("scroll", onScroll);
      scrollEl.removeEventListener("wheel", onWheel);
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      setReady(false);
      scene?.dispose();
      scene = null;
    };
  }, [active, enterFrom]);

  return (
    <div className="city-stage" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className={`city-stage__canvas${ready ? " is-ready" : ""}`}
      />
      <div ref={scrollRef} className="city-scroll">
        <div className="city-spacer" />
      </div>
      <div ref={captionRef} className="city-caption">
        <span className="caption__kicker">arrival</span>
        <h2 className="caption__title">City Lights</h2>
        <p className="caption__body">
          More than half of humanity now lives in cities. After dark, their glow
          is the brightest mark we leave on the night side of Earth.
        </p>
      </div>
    </div>
  );
}
