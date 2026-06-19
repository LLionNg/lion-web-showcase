// Quick URL-param toggles to isolate a visual artifact without editing code.
// Append e.g. ?noparallax or ?bloom to the URL.
//
//   ?noparallax  — disable the mouse-driven camera parallax
//   ?bloom       — enable the bloom + vignette post-processing pass
const params =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

export const DBG = {
  noParallax: params.has("noparallax"),
  // Post-processing is OPT-IN while we isolate a render-loop issue.
  bloom: params.has("bloom"),
};
