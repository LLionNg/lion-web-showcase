import { useEffect, useRef } from "react";
import { scrollState } from "./progress";
import { clamp01, labelOpacity } from "./util";

interface Caption {
  kicker: string;
  title: string;
  body: string;
  /** Visible scroll window [start, end]. */
  range: [number, number];
}

const CAPTIONS: Caption[] = [
  {
    kicker: "≈ 12,742 km",
    title: "Earth",
    body: "Home. A pale blue world, the only place we know that holds life.",
    range: [-0.02, 0.15],
  },
  {
    kicker: "≈ 9 billion km",
    title: "The Solar System",
    body: "Eight planets bound to an ordinary yellow star we call the Sun.",
    range: [0.16, 0.29],
  },
  {
    kicker: "≈ 1,000 light-years",
    title: "Into the Milky Way",
    body: "Drifting through clouds of gas and the glow of countless stars.",
    range: [0.3, 0.42],
  },
  {
    kicker: "≈ 26,000 light-years",
    title: "Sagittarius A*",
    body: "A supermassive black hole, 4 million Suns, anchoring the galaxy's heart.",
    range: [0.46, 0.58],
  },
  {
    kicker: "≈ 100,000 light-years",
    title: "The Milky Way",
    body: "A barred spiral of 100 to 400 billion stars. One of them is ours.",
    range: [0.63, 0.75],
  },
  {
    kicker: "≈ 93 billion light-years",
    title: "The Observable Universe",
    body: "Two trillion galaxies, and beyond them lies everything, and the unknown.",
    range: [0.87, 1.01],
  },
];

export default function Overlay() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const o = scrollState.offset;
      CAPTIONS.forEach((c, i) => {
        const el = refs.current[i];
        if (!el) return;
        const op = labelOpacity(o, c.range[0], c.range[1]);
        el.style.opacity = String(op);
        // Gentle upward drift as each caption fades.
        el.style.transform = `translate(-50%, ${(1 - op) * 14}px)`;
      });
      if (hintRef.current) {
        hintRef.current.style.opacity = String(1 - clamp01(o * 14));
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${clamp01(o)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="overlay" aria-hidden="true">
      {CAPTIONS.map((c, i) => (
        <div
          key={c.title}
          className="caption"
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <span className="caption__kicker">{c.kicker}</span>
          <h2 className="caption__title">{c.title}</h2>
          <p className="caption__body">{c.body}</p>
        </div>
      ))}

      <div className="hint" ref={hintRef}>
        <span>scroll to travel</span>
        <span className="hint__arrow">↓</span>
      </div>

      <div className="progress">
        <div className="progress__bar" ref={barRef} />
      </div>
    </div>
  );
}
