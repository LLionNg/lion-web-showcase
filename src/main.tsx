import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Always begin the journey at Earth; don't let the browser restore scroll.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// NOTE: no <StrictMode> here on purpose. Its dev-only double mount/unmount
// tears down and re-creates the R3F + postprocessing render loop, which can
// leave the loop stalled (scene only repaints on input). Continuous rendering
// is guaranteed by frameloop="always" on the Canvas.
createRoot(document.getElementById("root")!).render(<App />);
