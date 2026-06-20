import { useRef, useState, type ReactNode } from "react";

// Themed glyphs (space / cosmos). Inherit `currentColor` + size from the button.
export const RocketIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

export const OrbitIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-22 12 12)" />
  </svg>
);

/**
 * Collapsing icon button. Icon-only by default; the label expands on hover (mouse
 * / fine pointer, via CSS) and — on touch — on a FIRST tap, with a SECOND tap
 * firing the action (so phone/tablet users see what it does before committing).
 * Keeps the header controls tiny on small screens.
 */
export default function IconButton({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const pointerType = useRef("mouse");
  const collapseTimer = useRef<number | undefined>(undefined);

  const handleClick = () => {
    // Touch: first tap reveals the label, second tap acts. Mouse/pen: hover
    // already revealed the label, so a click just acts.
    if (pointerType.current === "touch" && !expanded) {
      setExpanded(true);
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = window.setTimeout(() => setExpanded(false), 3200);
      return;
    }
    window.clearTimeout(collapseTimer.current);
    setExpanded(false);
    onClick();
  };

  return (
    <button
      className={`icon-btn ${className}${expanded ? " is-expanded" : ""}`}
      onPointerDown={(e) => {
        pointerType.current = e.pointerType || "mouse";
      }}
      onClick={handleClick}
      aria-label={label}
    >
      <span className="icon-btn__label">{label}</span>
      <span className="icon-btn__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
