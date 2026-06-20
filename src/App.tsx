import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Experience from "./cosmos/Experience";
import Overlay from "./cosmos/Overlay";
import { DBG } from "./cosmos/debug";
import { scrollState } from "./cosmos/progress";
import type { EarthPhase } from "./cosmos/HomeEarth";

// Heavy worlds are code-split so the initial load stays lean.
const HomeEarth = lazy(() => import("./cosmos/HomeEarth"));
const Portfolio = lazy(() => import("./portfolio/Portfolio"));

// Earth ⟷ cosmos hand-off (zoom out past the globe → solar system).
const HANDOFF_OFFSET = 0.22;
const HANDBACK_BELOW = 0.18;
// Length of the "dive" warp into the portfolio — must match the CSS animation.
const DIVE_MS = 1150;

const scrollEl = () =>
  [...document.querySelectorAll("div")].find(
    (e) => e.scrollHeight > e.clientHeight + 5,
  );

export default function App() {
  // earthActive: interactive globe.gl earth (true) vs R3F cosmic zoom (false).
  const [earthActive, setEarthActive] = useState(true);
  // the portfolio "world" you dive into at the bottom of the zoom.
  const [inPortfolio, setInPortfolio] = useState(DBG.portfolio);
  const [diving, setDiving] = useState(false);
  // bumped on return-to-orbit so the globe flies back out.
  const [homeSignal, setHomeSignal] = useState(0);
  // where the portfolio lands: top (Enter button) vs bottom (deep-zoom dive).
  const [portfolioTop, setPortfolioTop] = useState(false);

  // Earth → cosmos: zoom-out past the full globe drops into the solar system.
  const toCosmos = useCallback(() => {
    const sc = scrollEl();
    if (sc) sc.scrollTop = (sc.scrollHeight - sc.clientHeight) * HANDOFF_OFFSET;
    setEarthActive(false);
  }, []);

  // Earth → portfolio: warp flash, then reveal. The deep-zoom dive lands at the
  // bottom (toolbox); the Enter Portfolio button lands at the top (hero).
  const diveToPortfolio = useCallback((landAtTop = false) => {
    setPortfolioTop(landAtTop);
    setDiving(true);
    window.setTimeout(() => {
      setInPortfolio(true);
      setDiving(false);
    }, DIVE_MS);
  }, []);

  // Portfolio → Earth: fly straight back out to the globe — both the Return to
  // orbit button and pushing out past the bottom of the portfolio land here.
  const returnToOrbit = useCallback(() => {
    setInPortfolio(false);
    setEarthActive(true);
    setHomeSignal((s) => s + 1);
  }, []);

  // Cosmos → Earth: scrolling back up to the solar system returns to the globe.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (earthActive || inPortfolio || diving) return;
      if (e.deltaY < 0 && scrollState.offset <= HANDBACK_BELOW)
        setEarthActive(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    // Touch equivalent (no wheel on mobile): a swipe DOWN at the top of the
    // cosmos flies back to the globe.
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (earthActive || inPortfolio || diving) return;
      const dy = (e.changedTouches[0]?.clientY ?? 0) - ty;
      if (dy > 48 && scrollState.offset <= HANDBACK_BELOW) setEarthActive(true);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [earthActive, inPortfolio, diving]);

  const earthPhase: EarthPhase = inPortfolio
    ? "hidden"
    : diving
      ? "warp"
      : earthActive
        ? "active"
        : "faded";

  return (
    <div className="app">
      <Canvas
        className="canvas"
        // Render the cosmos only when it's the active view. When the globe (or
        // portfolio) is up the cosmos is hidden behind it, so freezing it means
        // each Earth<->cosmos crossfade renders a single WebGL canvas (globe live
        // + cosmos frozen, or cosmos live + globe paused) instead of both at once
        // - which is what stuttered the hand-off.
        frameloop={earthActive ? "never" : "always"}
        camera={{ position: [0, 0, 6], fov: 50, near: 0.3, far: 150 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <color attach="background" args={["#05060a"]} />
        <Suspense fallback={null}>
          <ScrollControls pages={7} damping={0.3}>
            <Experience />
          </ScrollControls>
        </Suspense>

        {DBG.bloom && (
          <EffectComposer>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.22}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.4} darkness={0.55} />
          </EffectComposer>
        )}
      </Canvas>

      <Suspense fallback={null}>
        <HomeEarth
          phase={earthPhase}
          onZoomOutToCosmos={toCosmos}
          onZoomIntoPortfolio={() => diveToPortfolio(false)}
          homeSignal={homeSignal}
        />
      </Suspense>

      {/* Shortcut straight into the portfolio. Available the whole way from Earth
          out to the observable universe (active = globe, faded = cosmos), but not
          mid-warp or once inside the portfolio. */}
      {(earthPhase === "active" || earthPhase === "faded") && (
        <button
          className="enter-portfolio"
          onClick={() => diveToPortfolio(true)}
          title="Go straight to the top of the portfolio"
        >
          Enter Portfolio
        </button>
      )}

      {diving && <div className="warp-flash on" aria-hidden="true" />}

      <Suspense fallback={null}>
        <Portfolio
          active={inPortfolio}
          landTop={portfolioTop}
          onReturn={returnToOrbit}
        />
      </Suspense>

      <Overlay />
    </div>
  );
}
