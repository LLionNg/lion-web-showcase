// The /?proto scene: SynthCity's renderer/composer/lighting recipe (ACES tone
// mapping, UnrealBloom strength 7, fog 0x12122a, ambient 0x1b2c80, sun
// 0x8b79ff) over a finite ported city, with a night Earth above it and a
// scroll-driven camera that dives from Earth down into the neon skyline.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { loadAssets } from "./assets";
import { buildCity } from "./city";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Camera keyframes (progress, position, look-at): a descent from above the
// skyline down a road gap (x ≈ -12) so the camera flies a canyon, not into a
// facade. (The Earth is a separate scene now; this is the city only.)
const KEYS: { p: number; pos: THREE.Vector3; look: THREE.Vector3 }[] = [
  { p: 0.0, pos: v(0, 1500, 700), look: v(0, 300, -250) },
  { p: 1.0, pos: v(-12, 360, -100), look: v(-12, 280, -1150) },
];

export class SynthCityScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private raf = 0;
  private disposed = false;

  private target = 0; // scroll progress 0..1 (from React)
  private current = 0; // damped
  private readonly look = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      9000,
    );
  }

  async init() {
    const assets = await loadAssets("/");
    if (this.disposed) return;

    // sky + fog (SynthCity night environment). Dim the background so the
    // strength-7 bloom doesn't smear the (frame-filling) sky into a wash —
    // SynthCity gets away with a brighter sky only because it's always low in
    // the fogged-out city.
    this.scene.background = assets.skyNight;
    this.scene.backgroundIntensity = 0.25;
    this.scene.fog = new THREE.Fog(0x12122a, 0, 2700);

    // lights
    const sun = new THREE.DirectionalLight(0x8b79ff, 0.1);
    sun.position.set(1, 0.5, 0.25);
    this.scene.add(sun, sun.target);
    this.scene.add(new THREE.AmbientLight(0x1b2c80, 0.5));

    // city
    const city = buildCity(assets, 12);
    this.scene.add(city.group);

    // composer: render + UnrealBloom (the strength-7 neon haze)
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      7.0, // strength
      1.0, // radius
      0.0, // threshold
    );
    this.composer.addPass(bloom);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    this.applyCamera(0);
    this.animate();
  }

  setProgress(p: number) {
    this.target = clamp01(p);
  }

  private applyCamera(p: number) {
    // find the keyframe segment and ease across it
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smooth(a.p, b.p, p);
    this.camera.position.lerpVectors(a.pos, b.pos, t);
    this.look.lerpVectors(a.look, b.look, t);
    this.camera.lookAt(this.look);
  }

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    // damp scroll for a smooth glide
    this.current += (this.target - this.current) * 0.08;
    this.applyCamera(this.current);
    this.composer.render();
  };

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.composer?.dispose();
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      }
    });
  }
}
