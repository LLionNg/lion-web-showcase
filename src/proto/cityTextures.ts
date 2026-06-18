import * as THREE from "three";

// Procedural lit-window texture for building faces: a grid of warm/cool
// windows, randomly on/off, on a dark facade.
export function windowTexture(size = 256): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#080810";
  ctx.fillRect(0, 0, size, size);

  const cols = 10;
  const rows = 14;
  const cw = size / cols;
  const ch = size / rows;
  const warm = ["#ffd9a0", "#ffe9c4", "#fff3dc"];
  const cool = ["#bcd0ff", "#cfe0ff"];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() > 0.55) continue; // window is dark
      const pal = Math.random() < 0.78 ? warm : cool;
      ctx.fillStyle = pal[(Math.random() * pal.length) | 0];
      ctx.globalAlpha = 0.45 + Math.random() * 0.55;
      ctx.fillRect(
        x * cw + cw * 0.22,
        y * ch + ch * 0.18,
        cw * 0.56,
        ch * 0.6,
      );
    }
  }
  ctx.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Procedural city-ground texture: a glowing street grid plus scattered bright
// points (signs, traffic) — the dominant light pattern seen from above.
export function cityGroundTexture(size = 1024): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, size, size);

  const cells = 22;
  const step = size / cells;
  ctx.strokeStyle = "rgba(255,196,120,0.30)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  for (let i = 0; i < 1400; i++) {
    const r = Math.random();
    ctx.fillStyle =
      r < 0.6
        ? "rgba(255,214,140,0.9)"
        : r < 0.85
          ? "rgba(255,255,235,0.9)"
          : "rgba(150,190,255,0.9)";
    const rad = Math.random() * 1.6 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
