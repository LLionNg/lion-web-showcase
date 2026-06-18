// Quick URL-param toggles to isolate the source of a visual artifact without
// editing code. Append e.g. ?flat or ?noclouds&nospin to the URL.
//
//   ?flat        — Earth uses an UNLIT material (no lighting/specular at all)
//   ?nonormal    — Earth drops its normal map
//   ?noclouds    — hide the separate cloud sphere (rules out z-fighting)
//   ?noparallax  — disable the mouse-driven camera parallax
//   ?nospin      — stop all idle rotation
//
// If the Earth shimmer disappears under one of these, that names the cause.
const params =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

export const DBG = {
  flatEarth: params.has("flat"),
  noNormal: params.has("nonormal"),
  noClouds: params.has("noclouds"),
  noParallax: params.has("noparallax"),
  noSpin: params.has("nospin"),
  // Post-processing is now OPT-IN while we isolate a render-loop issue.
  bloom: params.has("bloom"),
};
