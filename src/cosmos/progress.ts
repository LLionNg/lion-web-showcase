// Module-level bridge so the DOM caption layer can read the WebGL scroll
// offset without forcing a React re-render every frame.
export const scrollState = { offset: 0 };
