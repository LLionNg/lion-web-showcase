import { useEffect, useRef } from "react";

/**
 * Hero name whose glyph interiors show a looping video, with a white stroke
 * outline so the letters stay legible on the dark gradient.
 *
 * BOTH the video fill and the white outline are drawn in the SAME <canvas> from
 * the same text calls, so they are always pixel-aligned. The earlier version
 * drew the outline as the <h1>'s CSS -webkit-text-stroke, which is a different
 * renderer than the canvas fill and diverged on iOS (the fill "overshot" the
 * outline). Canvas 2D also sidesteps iOS Safari ignoring SVG clip-path / CSS
 * masks applied to a <video> layer.
 *
 * A hidden muted autoplaying <video> is the decode source. Per frame: draw the
 * frame "cover", clip it to the glyphs with a pre-built `destination-in` text
 * mask, then strokeText the outline on top. The real <h1> stays (transparent, on
 * top) for layout sizing + selectable SEO text; it no longer paints anything.
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

    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d");

    let w = 1;
    let h = 1;
    let dpr = 1;
    let fontStr = "";
    let lsStr = "0px";
    let by = 0;

    const applyText = (c: CanvasRenderingContext2D) => {
      c.font = fontStr;
      c.textBaseline = "middle";
      try {
        c.letterSpacing = lsStr;
      } catch {
        /* canvas letterSpacing is a no-op on older Safari - fine, both the mask
           and the stroke below get the same treatment, so they stay aligned */
      }
    };

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
      fontStr = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      lsStr = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
      by = (parseFloat(cs.lineHeight) || h) / 2;
      if (!mctx) return;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, w, h);
      applyText(mctx);
      mctx.fillStyle = "#fff";
      mctx.fillText(name, 0, by);
    };

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
      // keep only the glyph shapes
      ctx.globalCompositeOperation = "destination-in";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(mask, 0, 0);
      // white outline drawn from the SAME text call -> can't drift from the fill
      ctx.globalCompositeOperation = "source-over";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyText(ctx);
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(name, 0, by);
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
