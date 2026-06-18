import { createRoot } from "react-dom/client";
import App from "./App";
import CityZoom from "./proto/CityZoom";
import "./styles.css";

// Always begin the journey at Earth; don't let the browser restore scroll.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// Prototype branch: /?proto renders the city→Earth zoom-in proof of concept.
const isProto = new URLSearchParams(window.location.search).has("proto");

// NOTE: no <StrictMode> here on purpose. Its dev-only double mount/unmount
// tears down and re-creates the R3F + postprocessing render loop, which can
// leave the loop stalled (scene only repaints on input). Continuous rendering
// is guaranteed by frameloop="always" on the Canvas.
createRoot(document.getElementById("root")!).render(
  isProto ? <CityZoom /> : <App />,
);
