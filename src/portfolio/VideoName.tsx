import { useEffect, useRef } from "react";

/**
 * Hero name whose glyph interiors show a looping video, with a white stroke
 * outline so the letters stay legible on the dark gradient.
 *
 * iOS Safari renders <video> (and SVG <foreignObject>) in a separate hardware
 * layer that ignores SVG clip-path / CSS masks, so the earlier SVG-clip version
 * showed the full video rectangle on real iPhones. This version composites in a
 * <canvas> instead - plain canvas 2D works identically across every browser:
 *   - a hidden, muted, autoplaying <video> is the decode source,
 *   - each frame is drawn "cover" into the canvas, then clipped to the glyphs
 *     with a single `destination-in` drawImage of a pre-built text-shape mask,
 *   - a real <h1> sits on top with a transparent fill (so the canvas shows
 *     through the letters) and a white -webkit-text-stroke (the outline). It also
 *     keeps the name as real, selectable text for SEO / a11y.
 *
 * The text mask is rendered ONCE (per size) to an offscreen canvas in source-
 * over so the letters ACCUMULATE - `destination-in` is intersective, so masking
 * letter-by-letter would cancel them out (non-overlapping glyphs -> empty). It's
 * built from the <h1>'s computed font/size/line-height/letter-spacing, so fill
 * and outline line up at every clamp() size. Drawing pauses when the overlay is
 * inactive or the tab is hidden; prefers-reduced-motion paints one static frame.
 */
export default function VideoName({
  name,
  src,
  active = true,
}: {
  name: string;
  src: string;
  active?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const h1 = h1Ref.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!h1 || !canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    // Offscreen text-shape mask (device-px). Rebuilt on resize, reused per frame.
    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d");

    let w = 1;
    let h = 1;
    let dpr = 1;

    const measure = () => {
      const cs = getComputedStyle(h1);
      const r = h1.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      mask.width = canvas.width;
      mask.height = canvas.height;
      if (!mctx) return;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, w, h);
      mctx.textBaseline = "middle";
      mctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      mctx.fillStyle = "#fff";
      const ls = parseFloat(cs.letterSpacing) || 0;
      const by = (parseFloat(cs.lineHeight) || h) / 2;
      let x = 0;
      for (const ch of name) {
        mctx.fillText(ch, x, by);
        x += mctx.measureText(ch).width + ls;
      }
    };

    // one composited frame: video "cover", then keep only the glyph shapes
    const stamp = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      const scale = Math.max(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.globalCompositeOperation = "destination-in";
      ctx.setTransform(1, 0, 0, 1, 0, 0); // mask is device-px; draw it 1:1
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let lastT = -1;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (video.readyState >= 2 && video.currentTime !== lastT) {
        lastT = video.currentTime;
        stamp();
      }
    };

    const start = () => {
      if (reduce) {
        const once = () => stamp();
        if (video.readyState >= 2) once();
        else video.addEventListener("loadeddata", once, { once: true });
        return;
      }
      video.play().catch(() => {});
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      video.pause();
    };

    measure();
    if (active) start();

    const ro = new ResizeObserver(() => {
      measure();
      if (video.readyState >= 2) stamp();
    });
    ro.observe(h1);
    const onVis = () => {
      if (document.hidden) stop();
      else if (active) start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [name, src, active]);

  return (
    <div className="pf-name-video" ref={wrapRef}>
      <video
        ref={videoRef}
        className="pf-name-srcvid"
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="pf-name-canvas" aria-hidden="true" />
      <h1 className="pf-name pf-name--video" ref={h1Ref}>
        {name}
      </h1>
    </div>
  );
}
