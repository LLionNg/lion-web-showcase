import { useEffect, useRef } from "react";
import { SynthCityScene } from "./synthcity/scene";
import { EarthScene } from "./synthcity/earthScene";

/**
 * PROTOTYPE (/?proto) — scroll-driven intro. Two independent scenes on stacked
 * canvases: the cosmos-style Earth on top (its own lighting + gentle bloom) and
 * the neon city beneath — a faithful vanilla-three port of SynthCity
 * (jeffbeene/synthcity, MIT) with its real materials, Perlin block generation,
 * coloured point lights and UnrealBloom. Scrolling zooms into the Earth, then
 * crossfades it out to reveal the city descent.
 */
export default function CityZoom() {
  const cityCanvasRef = useRef<HTMLCanvasElement>(null);
  const earthCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const city = new SynthCityScene(cityCanvasRef.current!);
    void city.init();
    const earth = new EarthScene(earthCanvasRef.current!);
    earth.init();

    const scrollEl = scrollRef.current!;
    const onScroll = () => {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      const p = max > 0 ? scrollEl.scrollTop / max : 0;
      city.setProgress(p);
      earth.setProgress(p);
    };
    const onResize = () => {
      city.resize();
      earth.resize();
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      city.dispose();
      earth.dispose();
    };
  }, []);

  return (
    <div className="app">
      <canvas ref={cityCanvasRef} className="canvas proto-city" />
      <canvas ref={earthCanvasRef} className="canvas proto-earth" />

      {/* transparent scroll surface that drives both scenes */}
      <div ref={scrollRef} className="proto-scroll">
        <div className="proto-spacer" />
      </div>

      <div className="overlay" aria-hidden="true">
        <div
          className="caption"
          style={{ opacity: 1, bottom: "8vh", transform: "translateX(-50%)" }}
        >
          <span className="caption__kicker">prototype</span>
          <h2
            className="caption__title"
            style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)" }}
          >
            Earth → Southeast Asia → Neon City
          </h2>
          <p className="caption__body">Scroll to descend. (SynthCity kit, MIT)</p>
        </div>
      </div>
    </div>
  );
}
