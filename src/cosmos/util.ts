// Small math + scroll helpers shared across the cosmic stages.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hermite smoothstep between edges a and b. */
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export interface StageConfig {
  /** Scroll offset (0..1) where this scale begins entering. */
  start: number;
  /** Scroll offset where this scale has fully receded. */
  end: number;
  /** Scale when the stage first appears (large = we're "inside" it). */
  bigScale?: number;
  /** Scale when the stage has receded into the distance. */
  smallScale?: number;
  /** Start fully visible at the very top (used by Earth). */
  fadeIn?: boolean;
  /** Stay visible at the very end (used by the Universe). */
  fadeOut?: boolean;
}

export interface StageState {
  opacity: number;
  scale: number;
  /** 0..1 progress across this stage's scroll window. */
  local: number;
}

/**
 * Maps the global scroll offset to a single stage's opacity + scale.
 * The "Powers of Ten" hand-off: each scale enters large, peaks, then
 * shrinks to a point and fades while the next, larger scale grows in.
 */
export function stageState(offset: number, c: StageConfig): StageState {
  const {
    start,
    end,
    bigScale = 2.4,
    smallScale = 0.12,
    fadeIn = true,
    fadeOut = true,
  } = c;

  const local = clamp01((offset - start) / (end - start));

  let opacity = 1;
  if (fadeIn) opacity *= smoothstep(0, 0.32, local);
  if (fadeOut) opacity *= 1 - smoothstep(0.68, 1, local);

  const scale = lerp(bigScale, smallScale, smoothstep(0, 1, local));

  return { opacity, scale, local };
}

/** Trapezoid visibility for DOM captions: fade in, hold, fade out. */
export function labelOpacity(offset: number, a: number, b: number) {
  const fade = 0.04;
  const inn = smoothstep(a, a + fade, offset);
  const out = 1 - smoothstep(b - fade, b, offset);
  return clamp01(Math.min(inn, out));
}

export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
