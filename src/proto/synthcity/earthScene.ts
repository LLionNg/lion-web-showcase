// Standalone Earth scene for the /?proto intro — the cosmos page's globe
// (day texture + clouds + fresnel atmosphere, lit by the same warm key / cool
// fill) with its own gentle bloom, rendered to its own canvas so it never
// shares the city's scene or its heavy bloom. The camera zooms in on scroll and
// the whole canvas fades out, handing off to the city beneath.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const FADE: [number, number] = [0.42, 0.6]; // canvas opacity 1 → 0
const ZOOM: [number, number] = [0, 0.55]; // dolly window

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vEye;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vEye)), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f);
  }
`;

export class EarthScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private earth = new THREE.Group();
  private raf = 0;
  private disposed = false;
  private target = 0;
  private current = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
  }

  init() {
    const loader = new THREE.TextureLoader();
    const day = loader.load("/textures/earth_atmos_2048.jpg");
    day.colorSpace = THREE.SRGBColorSpace;
    const normal = loader.load("/textures/earth_normal_2048.jpg");
    const clouds = loader.load("/textures/earth_clouds_1024.png");
    clouds.colorSpace = THREE.SRGBColorSpace;
    const milkyway = loader.load("/textures/milkyway.jpg");
    milkyway.colorSpace = THREE.SRGBColorSpace;
    milkyway.mapping = THREE.EquirectangularReflectionMapping;

    // starfield backdrop, dimmed so bloom doesn't smear it
    this.scene.background = milkyway;
    this.scene.backgroundIntensity = 0.35;

    // cosmos-page lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xfff6ec, 2.4);
    key.position.set(3, 1.5, 5);
    const fill = new THREE.DirectionalLight(0x3a5a9a, 0.25);
    fill.position.set(-5, -2, -3);
    this.scene.add(key, fill);

    // globe
    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(2, 96, 96),
      new THREE.MeshStandardMaterial({
        map: day,
        normalMap: normal,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughness: 1,
        metalness: 0,
      }),
    );
    this.earth.add(surface);

    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(2, 80, 80),
      new THREE.MeshStandardMaterial({
        map: clouds,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        roughness: 1,
      }),
    );
    cloud.scale.setScalar(1.04);
    this.earth.add(cloud);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uColor: { value: new THREE.Color("#4ea6ff") },
          uPower: { value: 3.0 },
          uIntensity: { value: 1.1 },
        },
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    atmosphere.scale.setScalar(1.16);
    this.earth.add(atmosphere);

    this.earth.rotation.set(0.3, -1.2, 0); // a populated face toward camera
    this.scene.add(this.earth);

    // gentle bloom — only the bright limb / clouds glow
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,
        0.4,
        0.6,
      ),
    );
    this.composer.setSize(window.innerWidth, window.innerHeight);

    this.animate();
  }

  setProgress(p: number) {
    this.target = clamp01(p);
  }

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    this.current += (this.target - this.current) * 0.08;

    // slow idle spin keeps the globe alive while you sit at the top
    this.earth.rotation.y += 0.0006;

    // dolly in
    const t = smooth(ZOOM[0], ZOOM[1], this.current);
    this.camera.position.set(0, 0, lerp(6.5, 3.4, t));
    this.camera.lookAt(0, 0, 0);

    // fade the whole canvas out into the city
    const op = 1 - smooth(FADE[0], FADE[1], this.current);
    this.canvas.style.opacity = String(op);
    if (op <= 0.001) return; // nothing to draw once fully handed off
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
