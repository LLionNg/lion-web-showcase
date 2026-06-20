import { useEffect, useRef, type ReactNode } from "react";

type Props<T> = {
  items: T[];
  renderItem: (item: T, key: string) => ReactNode;
  label: string;
};

/**
 * Infinite, drag/swipe-able horizontal carousel with a cosmos theme.
 *
 * - Loops forever in both directions (the item list is repeated and the track
 *   position wraps by one "period"; copies are identical so it's seamless).
 * - Drives off mouse drag, touch swipe (horizontal; vertical still scrolls the
 *   page), trackpad horizontal wheel, and prev/next arrows — with momentum.
 * - A parallax starfield behind the cards warps into streaks as you slide; the
 *   cards recede into depth toward the edges so the centre one is in focus.
 *
 * To add projects, just append to `data.ts` — the loop grows automatically.
 */
export default function ProjectCarousel<T>({
  items,
  renderItem,
  label,
}: Props<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Repeat the list to fake the infinite loop. 4 copies over-fill any realistic
  // viewport; wrapping by one period lands on identical content (seamless).
  const COPIES = 4;
  const loop: { item: T; key: string }[] = [];
  for (let c = 0; c < COPIES; c++)
    items.forEach((item, i) => loop.push({ item, key: `c${c}-${i}` }));

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const prev = prevRef.current;
    const next = nextRef.current;
    if (!viewport || !track || !canvas) return;
    const ctx = canvas.getContext("2d");

    // ---- motion state ----
    let pos = 0; // track translateX
    let vel = 0; // px/frame
    let target: number | null = null; // arrow / wheel-snap goal
    let period = 0; // width of one copy of the items
    let centers: number[] = []; // each card's resting centre within the track
    let lifts: number[] = []; // eased hover lift per card
    let hovered: HTMLElement | null = null;
    let raf = 0;
    let idle = 0;
    // drag
    let dragging = false;
    let decided = false;
    let horizontal = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastDx = 0;
    let moved = 0;
    let justDragged = false;
    // starfield
    type Star = { x: number; y: number; z: number };
    let stars: Star[] = [];
    let cw = 0;
    let ch = 0;

    const cards = () => Array.from(track.children) as HTMLElement[];

    const measure = () => {
      const els = cards();
      if (els.length <= items.length) return;
      period = els[items.length].offsetLeft - els[0].offsetLeft;
      centers = els.map((el) => el.offsetLeft + el.offsetWidth / 2);
      if (lifts.length !== els.length) lifts = els.map(() => 0);
      if (!pos && period) pos = -period; // start on the 2nd copy
    };

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = viewport.clientWidth;
      ch = viewport.clientHeight;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(26, Math.round((cw * ch) / 6500));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * cw,
        y: Math.random() * ch,
        z: Math.random() * 0.88 + 0.12,
      }));
    };

    const drawStars = (v: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      const speed = Math.abs(v);
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "lighter"; // stars glow / add up
      for (const s of stars) {
        s.x -= v * s.z * 0.72 + 0.05 * s.z; // parallax + gentle idle drift
        if (s.x < -40) s.x += cw + 80;
        else if (s.x > cw + 40) s.x -= cw + 80;
        const r = s.z * 1.7 + 0.4;
        const a = 0.22 + s.z * 0.5;
        if (speed > 5) {
          // warp: streak into a light-speed line, length scaled by depth + speed
          const len = Math.min(82, speed * s.z * 1.25);
          ctx.strokeStyle = `rgba(150,190,255,${Math.min(0.85, a * 1.45)})`;
          ctx.lineWidth = r;
          ctx.beginPath();
          ctx.moveTo(s.x - len / 2, s.y);
          ctx.lineTo(s.x + len / 2, s.y);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(184,202,255,${a})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const layout = () => {
      const els = cards();
      const vpc = viewport.clientWidth / 2;
      for (let i = 0; i < els.length; i++) {
        const sx = (centers[i] ?? 0) + pos;
        const t = Math.max(-1.7, Math.min(1.7, (sx - vpc) / vpc));
        const ab = Math.abs(t);
        const scale = 1 - Math.min(0.2, ab * 0.15);
        const rotY = t * -8;
        const op = 1 - Math.min(0.6, ab * 0.46);
        const goal = els[i] === hovered ? -12 : 0;
        lifts[i] = (lifts[i] ?? 0) + (goal - (lifts[i] ?? 0)) * 0.18;
        els[i].style.transform =
          `translate3d(0,${lifts[i].toFixed(1)}px,0) perspective(1100px) ` +
          `rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        els[i].style.opacity = op.toFixed(3);
        els[i].style.zIndex = String(200 - Math.round(ab * 80));
      }
    };

    const wrap = () => {
      if (period <= 0) return;
      const shift = (d: number) => {
        pos += d;
        if (target !== null) target += d;
      };
      let g = 0;
      while (pos > -period && g++ < 12) shift(-period);
      while (pos <= -2 * period && g++ < 24) shift(period);
    };

    const tick = () => {
      if (!dragging) {
        if (target !== null) {
          const d = target - pos;
          pos += d * 0.12;
          vel = d * 0.12;
          if (Math.abs(d) < 0.5) {
            pos = target;
            target = null;
            vel = 0;
          }
        } else {
          pos += vel;
          vel *= 0.93;
          if (Math.abs(vel) < 0.03) vel = 0;
        }
      }
      wrap();
      track.style.transform = `translate3d(${pos.toFixed(2)}px,0,0)`;
      layout();
      drawStars(dragging ? lastDx : vel);
      const moving =
        dragging || target !== null || Math.abs(vel) > 0.03 || !!hovered;
      if (moving) {
        idle = 0;
        raf = requestAnimationFrame(tick);
      } else if (idle++ < 60) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    const wake = () => {
      if (!raf) {
        idle = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    // ---- drag (pointer events cover mouse + touch) ----
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      decided = e.pointerType === "mouse";
      horizontal = e.pointerType === "mouse";
      startX = lastX = e.clientX;
      startY = e.clientY;
      moved = 0;
      lastDx = 0;
      vel = 0;
      target = null;
      if (e.pointerType === "mouse") {
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (!decided) {
        const tx = Math.abs(e.clientX - startX);
        const ty = Math.abs(e.clientY - startY);
        if (tx < 6 && ty < 6) return;
        horizontal = tx > ty;
        decided = true;
        if (horizontal) {
          viewport.classList.add("is-dragging");
          try {
            viewport.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        } else {
          dragging = false; // vertical intent -> let the page scroll
          return;
        }
      }
      if (!horizontal) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      lastDx = dx;
      pos += dx;
      vel = dx;
      moved += Math.abs(dx);
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      justDragged = moved > 8;
      viewport.classList.remove("is-dragging");
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      wake();
    };

    // a drag shouldn't fire the card's link click
    const onClickCap = (e: MouseEvent) => {
      if (justDragged) {
        e.preventDefault();
        e.stopPropagation();
        justDragged = false;
      }
    };

    // delegated hover (cards are cloned, so listen on the track)
    const onOver = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest?.(".pf-card");
      if (card) {
        hovered = card as HTMLElement;
        wake();
      }
    };
    const onOut = (e: PointerEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (!to || !to.closest?.(".pf-card")) {
        hovered = null;
        wake();
      }
    };

    // horizontal trackpad / shift-wheel
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) + 2) {
        e.preventDefault();
        pos -= e.deltaX;
        vel = -e.deltaX * 0.5;
        target = null;
        wake();
      }
    };

    const step = () => Math.max(period * 0.34, viewport.clientWidth * 0.8);
    const goPrev = () => {
      target = (target ?? pos) + step();
      wake();
    };
    const goNext = () => {
      target = (target ?? pos) - step();
      wake();
    };

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    track.addEventListener("click", onClickCap, true);
    track.addEventListener("pointerover", onOver);
    track.addEventListener("pointerout", onOut);
    prev?.addEventListener("click", goPrev);
    next?.addEventListener("click", goNext);

    const onResize = () => {
      seed();
      measure();
      wake();
    };
    window.addEventListener("resize", onResize);

    // measure once layout has settled (after fonts/images)
    const initRaf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        seed();
        measure();
        wake();
      }),
    );

    return () => {
      cancelAnimationFrame(initRaf);
      if (raf) cancelAnimationFrame(raf);
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
      viewport.removeEventListener("wheel", onWheel);
      track.removeEventListener("click", onClickCap, true);
      track.removeEventListener("pointerover", onOver);
      track.removeEventListener("pointerout", onOut);
      prev?.removeEventListener("click", goPrev);
      next?.removeEventListener("click", goNext);
      window.removeEventListener("resize", onResize);
    };
  }, [items]);

  return (
    <div className="pf-carousel" data-reveal>
      <canvas
        className="pf-carousel__stars"
        ref={canvasRef}
        aria-hidden="true"
      />
      <div className="pf-carousel__viewport" ref={viewportRef}>
        <div className="pf-carousel__track" ref={trackRef}>
          {loop.map(({ item, key }) => renderItem(item, key))}
        </div>
      </div>
      <button
        className="pf-carousel__nav pf-carousel__nav--prev"
        ref={prevRef}
        type="button"
        aria-label={`${label}: previous`}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        className="pf-carousel__nav pf-carousel__nav--next"
        ref={nextRef}
        type="button"
        aria-label={`${label}: next`}
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
