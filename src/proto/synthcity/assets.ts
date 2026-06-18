// Port of SynthCity's AssetManager (jeffbeene/synthcity, MIT) — the building /
// ground textures, OBJ models and the exact MeshPhongMaterial recipe that gives
// the city its look (specular + spec map + night env reflection + a random
// near-white HSL emissive masked by the window map + diffuse-as-bump). Trimmed
// to what the fly-in needs: buildings, ground and the night sky.

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const ANISO = 8;
// SynthCity night environment: windowLights on → emissive 1.5.
const WINDOW_EMISSIVE = 1.5;

// 15 building models used by the block generator.
const BUILDING_MODELS = [
  "s_01_01", "s_01_02", "s_01_03",
  "s_02_01", "s_02_02", "s_02_03",
  "s_03_01", "s_03_02", "s_03_03",
  "s_04_01", "s_04_02", "s_04_03",
  "s_05_01", "s_05_02", "s_05_03",
];

export interface Assets {
  models: Record<string, THREE.BufferGeometry>;
  materials: Record<string, THREE.Material>;
  skyNight: THREE.Texture;
}

export function loadAssets(base = "/"): Promise<Assets> {
  const tex = base + "textures/city/";
  const mdl = base + "models/city/";

  const manager = new THREE.LoadingManager();
  const texLoader = new THREE.TextureLoader(manager);
  const objLoader = new OBJLoader(manager);

  const textures: Record<string, THREE.Texture> = {};
  const models: Record<string, THREE.BufferGeometry> = {};

  // --- textures ---
  const loadTex = (
    key: string,
    file: string,
    opts: { srgb?: boolean; equirect?: boolean; repeat?: boolean } = {},
  ) => {
    const t = texLoader.load(tex + file);
    if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (opts.equirect) t.mapping = THREE.EquirectangularReflectionMapping;
    if (opts.repeat) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    }
    t.anisotropy = ANISO;
    t.magFilter = THREE.LinearFilter;
    textures[key] = t;
    return t;
  };

  loadTex("sky_night", "sky_night.jpg", { srgb: true, equirect: true });
  loadTex("env_night", "env_night.jpg", { equirect: true });
  loadTex("ground", "ground.jpg", { srgb: true, repeat: true });
  loadTex("ground_em", "ground_em.jpg", { srgb: true, repeat: true });

  for (let i = 1; i <= 10; i++) {
    const id = String(i).padStart(2, "0");
    loadTex("building_" + id, `building_${id}.jpg`, { srgb: true, repeat: true });
    loadTex("building_" + id + "_em", `building_${id}_em.jpg`, {
      srgb: true,
      repeat: true,
    });
    loadTex("building_" + id + "_spec", `building_${id}_spec.jpg`, {
      repeat: true,
    });
  }

  // --- models ---
  for (const name of BUILDING_MODELS) {
    objLoader.load(mdl + name + ".obj", (obj) => {
      const mesh = obj.children[0] as THREE.Mesh;
      models[name] = mesh.geometry;
    });
  }
  // ground plane (block + road), matches SynthCity's PlaneGeometry size
  models["ground"] = new THREE.PlaneGeometry(128 + 24, 128 + 24);

  // --- materials (built after textures resolve) ---
  const materials: Record<string, THREE.Material> = {};
  const buildMaterials = () => {
    materials["ground"] = new THREE.MeshPhongMaterial({
      map: textures["ground"],
      emissive: new THREE.Color(0x0090ff),
      emissiveMap: textures["ground_em"],
      emissiveIntensity: 0.2,
      shininess: 0,
    });

    for (let i = 1; i <= 10; i++) {
      const id = String(i).padStart(2, "0");
      materials["building_" + id] = new THREE.MeshPhongMaterial({
        map: textures["building_" + id],
        specular: new THREE.Color(0xffffff),
        specularMap: textures["building_" + id + "_spec"],
        envMap: textures["env_night"],
        emissive: new THREE.Color().setHSL(Math.random(), 1.0, 0.95),
        emissiveMap: textures["building_" + id + "_em"],
        emissiveIntensity: WINDOW_EMISSIVE,
        bumpMap: textures["building_" + id],
        bumpScale: 5,
      });
    }
  };

  return new Promise<Assets>((resolve, reject) => {
    manager.onLoad = () => {
      buildMaterials();
      resolve({ models, materials, skyNight: textures["sky_night"] });
    };
    manager.onError = (url) => reject(new Error("Failed to load " + url));
  });
}
