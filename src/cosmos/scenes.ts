// The ordered journey, innermost (zoom-in) → outermost (zoom-out). Cosmos
// `offset` anchors are the centres of the Overlay caption ranges, so the scene
// nav and the captions always agree. Earth is the globe (HomeEarth); Portfolio
// is the dive target — neither has a cosmos offset.
export type SceneKind = "portfolio" | "earth" | "cosmos";
export type Scene = {
  id: string;
  label: string;
  kind: SceneKind;
  offset: number; // cosmos scroll anchor (0..1); unused for portfolio/earth
};

export const SCENES: Scene[] = [
  { id: "portfolio", label: "Portfolio", kind: "portfolio", offset: 0 },
  { id: "earth", label: "Earth", kind: "earth", offset: 0 },
  { id: "solar", label: "The Solar System", kind: "cosmos", offset: 0.22 },
  { id: "milkyway-into", label: "Into the Milky Way", kind: "cosmos", offset: 0.36 },
  { id: "sagittarius", label: "Sagittarius A*", kind: "cosmos", offset: 0.52 },
  { id: "milkyway", label: "The Milky Way", kind: "cosmos", offset: 0.69 },
  { id: "universe", label: "The Observable Universe", kind: "cosmos", offset: 0.94 },
];

export const EARTH_SCENE_INDEX = 1;
const FIRST_COSMOS_INDEX = 2;

// Which scene are we "at"? Earth when the globe is up; otherwise the cosmos
// scene whose anchor is nearest the live scroll offset.
export function currentSceneIndex(earthActive: boolean, offset: number): number {
  if (earthActive) return EARTH_SCENE_INDEX;
  let best = FIRST_COSMOS_INDEX;
  let bestDist = Infinity;
  for (let i = FIRST_COSMOS_INDEX; i < SCENES.length; i++) {
    const d = Math.abs(offset - SCENES[i].offset);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
