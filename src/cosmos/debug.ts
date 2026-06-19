// Quick URL-param toggles to isolate a visual artifact / shortcut a view
// without editing code. Append e.g. ?portfolio or ?bloom to the URL.
//
//   ?noparallax  — disable the mouse-driven camera parallax
//   ?bloom       — enable the bloom + vignette post-processing pass
//   ?portfolio   — boot straight into the portfolio (skip the zoom dive)
const params =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

export const DBG = {
  noParallax: params.has("noparallax"),
  // Post-processing is OPT-IN while we isolate a render-loop issue.
  bloom: params.has("bloom"),
  // Dev shortcut: boot directly into the portfolio "world".
  portfolio: params.has("portfolio"),
};
