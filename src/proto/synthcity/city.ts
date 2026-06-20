// Port of SynthCity's city-block generator (GeneratorItem_CityBlock /
// GeneratorUtils, jeffbeene/synthcity, MIT). Same Perlin-driven block layout
// and building-type/material/rotation selection as the original — but baked
// once over a *finite* grid of blocks around the origin (no streaming, no
// collision, no ads/toppers/megas) since the fly-in only needs the skyline.

import * as THREE from "three";
import { Perlin } from "./noise";
import type { Assets } from "./assets";

const BLOCK = 128; // cityBlockSize
const ROAD = 24; // roadWidth
const CELL = BLOCK + ROAD; // 152
const NOISE_FACTOR = 0.0017;
const SEED = 9746;

// remap proc-noise's bunched [0.2,0.75] range to [0,1) — SynthCity's fixNoise.
function fixNoise(n: number) {
  const v = ((n - 0.2) * 0.9999) / (0.75 - 0.2);
  return v < 0 ? 0 : v > 0.9999 ? 0.9999 : v;
}
function buildingRotation(noise: number) {
  return [0, 90, 180, 270][Math.floor(noise * 4)];
}

export interface City {
  group: THREE.Group;
  lights: THREE.PointLight[];
  /** radius of the generated area in world units (for camera framing). */
  extent: number;
}

/**
 * Build a finite neon city. `radius` is the number of blocks from centre to
 * edge (a (2r+1)² grid of 152-unit blocks).
 */
export function buildCity(assets: Assets, radius = 12): City {
  const noise = new Perlin(SEED);
  noise.noiseDetail(8, 0.5);
  const group = new THREE.Group();

  const mat = (id: string) => assets.materials[id];
  const model = (id: string) => assets.models[id];
  const getBuildingMat = (n: number) =>
    mat(["building_01", "building_02", "building_03", "building_04", "building_05", "building_07"][
      Math.floor(n * 6)
    ]);
  const getBigBuildingMat = (n: number, rare: boolean) =>
    rare
      ? mat(["building_06", "building_08", "building_09", "building_10"][Math.floor(n * 4)])
      : mat(["building_01", "building_02", "building_03", "building_04", "building_05"][Math.floor(n * 5)]);

  const addBuilding = (
    geoId: string,
    material: THREE.Material,
    x: number,
    z: number,
    scaleY: number,
    rotDeg: number,
  ) => {
    const m = new THREE.Mesh(model(geoId), material);
    m.position.set(x, 0, z);
    m.scale.set(1, scaleY, 1);
    m.rotateY((rotDeg * Math.PI) / 180);
    group.add(m);
  };

  for (let ix = -radius; ix <= radius; ix++) {
    for (let iz = -radius; iz <= radius; iz++) {
      const x = ix * CELL;
      const z = iz * CELL;

      let typeNoise = fixNoise(noise.noise(x * NOISE_FACTOR, z * NOISE_FACTOR));

      if (typeNoise < 0.1) {
        // empty lot
      } else if (typeNoise < 0.8) {
        // 2×2 small buildings
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            const xOff = i * (BLOCK / 2) + BLOCK / 4;
            const zOff = j * (BLOCK / 2) + BLOCK / 4;
            const px = x + xOff;
            const pz = z + zOff;

            const rotateNoise = fixNoise(noise.noise(px * 5, pz * 5));
            const rotate = buildingRotation(rotateNoise);
            const scale = 0.75 + rotateNoise * 0.45;

            const tN = fixNoise(noise.noise(px * NOISE_FACTOR, pz * NOISE_FACTOR));
            const sN = fixNoise(noise.noise(px * 5, pz * 5));
            let type: string;
            if (tN < 0.267) type = sN < 0.33 ? "s_01_01" : sN < 0.66 ? "s_01_02" : "s_01_03";
            else if (tN < 0.534) type = sN < 0.33 ? "s_02_01" : sN < 0.66 ? "s_02_02" : "s_02_03";
            else type = sN < 0.33 ? "s_03_01" : sN < 0.66 ? "s_03_02" : "s_03_03";

            const matNoise = fixNoise(noise.noise(px * -3, pz * -3));
            addBuilding(type, getBuildingMat(matNoise), px, pz, scale, rotate);
          }
        }
      } else {
        // single large building / tower
        const isTower = typeNoise > 0.975;
        const xOff = BLOCK / 2;
        const zOff = BLOCK / 2;
        const px = x + xOff;
        const pz = z + zOff;

        const sN = fixNoise(noise.noise(x * 4, z * 4));
        let type: string;
        if (isTower) type = sN < 0.33 ? "s_05_01" : sN < 0.66 ? "s_05_02" : "s_05_03";
        else type = sN < 0.33 ? "s_04_01" : sN < 0.66 ? "s_04_02" : "s_04_03";

        const matNoise = fixNoise(noise.noise(px * -3, pz * -3));
        const material = getBigBuildingMat(matNoise, sN > 0.9);

        const rotateNoise = fixNoise(noise.noise(px * 4, pz * 4));
        const rotate = buildingRotation(rotateNoise);
        const scale = 1 + rotateNoise * 0.5;

        addBuilding(type, material, px, pz, scale, rotate);
      }

      // ground plane for the block
      const ground = new THREE.Mesh(model("ground"), mat("ground"));
      ground.rotateX(-Math.PI / 2);
      ground.position.set(x + BLOCK / 2, 0, z + BLOCK / 2);
      group.add(ground);
    }
  }

  // --- coloured point lights (GeneratorItem_CityLight) ---
  // Placed on a coarse 4×-block grid where the noise selects "edge" cells; hue
  // 0.5..1.0 (cyan→magenta) is what tints whole districts in the original.
  const lights: THREE.PointLight[] = [];
  const COARSE = CELL * 4;
  const cr = Math.floor((radius * CELL) / COARSE);
  for (let ix = -cr; ix <= cr && lights.length < 18; ix++) {
    for (let iz = -cr; iz <= cr && lights.length < 18; iz++) {
      const x = ix * COARSE;
      const z = iz * COARSE;
      const tN = fixNoise(noise.noise(x * NOISE_FACTOR, z * NOISE_FACTOR));
      if (tN < 0.2 || tN > 0.8) {
        const colorNoise = fixNoise(noise.noise(x * 4, z * 4));
        const hue = 0.5 + colorNoise / 2;
        const light = new THREE.PointLight(0x000000, 100, 2000);
        light.decay = 1;
        light.color.setHSL(hue, 1, 0.5);
        light.position.set(x, 100, z);
        group.add(light);
        lights.push(light);
      }
    }
  }

  return { group, lights, extent: radius * CELL };
}
