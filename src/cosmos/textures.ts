import * as THREE from "three";

/**
 * Generates a soft radial-gradient sprite on a canvas. Used for star/galaxy
 * points and glows so particles read as soft round light instead of squares.
 */
export function radialSprite(
  inner = "rgba(255,255,255,1)",
  mid = "rgba(255,255,255,0.35)",
  size = 128,
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0.0, inner);
  g.addColorStop(0.25, mid);
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Radial-gradient sprite from explicit color stops, for smooth multi-stop
 * glows (e.g. the Sun's seamless corona) with no visible banding edge.
 */
export function gradientSprite(
  stops: [number, string][],
  size = 256,
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
