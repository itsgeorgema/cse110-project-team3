import "./style.css";
import { OverworldMap } from "./view/overworld/OverworldMap.ts";

// Composition root: the one place that builds the objects and wires them together.
const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error("index.html is missing <div id=\"app\">");
}
new OverworldMap(container);
