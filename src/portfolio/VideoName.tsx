import { useEffect, useRef } from "react";

/**
 * Hero name whose glyph interiors are a window onto a looping video, with a white
 * stroke outline so the letters stay legible on the dark gradient.
 *
 * One SVG owns a single set of <text> coordinates used twice: (1) as a <clipPath>
 * that clips a <foreignObject> holding the <video> (so footage shows only inside
 * the letters), and (2) as a stroked <text> on top for the outline - so fill and
 * outline are always pixel-aligned. No viewBox, so the font-size is real CSS px
 * and matches the rest of the hero type. A real <h1> is kept (visually hidden)
 * for SEO / accessibility; the SVG is aria-hidden decoration.
 */
export default function VideoName({ name, src }: { name: string; src: string }) {
  const clipId = "pf-name-clip";
  const videoRef = useRef<HTMLVideoElement>(null);

  // Muted + autoplay + loop already lets it start; this is a safety net for the
  // case where it mounts while the tab/overlay is hidden (autoplay gets paused).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.play().catch(() => {});
    };
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    return () => document.removeEventListener("visibilitychange", tryPlay);
  }, [src]);

  return (
    <div className="pf-name-video">
      {/* real heading for SEO / a11y, visually hidden */}
      <h1 className="pf-name-sr">{name}</h1>
      <svg className="pf-name-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <text x="0" y="50%" dominantBaseline="central" className="pf-name-glyphs">
              {name}
            </text>
          </clipPath>
        </defs>
        <foreignObject
          x="0"
          y="0"
          width="100%"
          height="100%"
          clipPath={`url(#${clipId})`}
        >
          <div className="pf-name-fo">
            <video
              ref={videoRef}
              className="pf-name-vid"
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
        </foreignObject>
        <text
          x="0"
          y="50%"
          dominantBaseline="central"
          className="pf-name-glyphs pf-name-stroke"
        >
          {name}
        </text>
      </svg>
    </div>
  );
}
