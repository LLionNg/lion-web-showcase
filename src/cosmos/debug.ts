// Code-level debug toggles. These intentionally do NOT read URL params: the
// production site has a single endpoint, the homepage. Flip a flag to true
// locally while debugging, but never ship it true.
export const DBG = {
  noParallax: false, // skip the mouse-driven camera parallax
  bloom: false, // bloom + vignette post-processing pass
  portfolio: false, // boot straight into the portfolio (skip the zoom dive)
};
