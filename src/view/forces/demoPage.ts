import Konva from "konva";
import type { DiagramState, Force } from "./ForceData";
import { ForceRenderer } from "./ForceRenderer";
import {
  cappedRatioForces,
  pushedCrateForces,
  restingCrateForces,
  sampleDiagramOptions,
} from "./sampleForces";

// Dev-only page (#96): four diagrams in a 2 × 2 grid on one Stage, each drawn
// into its own Group. Not part of the game or the production build.

const CELL = 300; // each diagram's sample layout fits in a 300 × 300 square
// Labels on short horizontal arrows extend away from the crate, past the
// layout's left edge, so each diagram gets room for them.
const LABEL_MARGIN = 80;
const CELL_WIDTH = CELL + LABEL_MARGIN;
const TITLE_HEIGHT = 20;

interface DemoDiagram {
  readonly title: string;
  readonly forces: readonly Force[];
  readonly state: DiagramState;
}

const diagrams: readonly DemoDiagram[] = [
  {
    title: "Resting crate: before answering",
    forces: restingCrateForces,
    state: "beforeAnswer",
  },
  {
    title: "Resting crate: after answering",
    forces: restingCrateForces,
    state: "afterAnswer",
  },
  {
    title: "Pushed crate (horizontal force)",
    forces: pushedCrateForces,
    state: "beforeAnswer",
  },
  {
    title: "3× cap: 5 N push vs 98.1 N",
    forces: cappedRatioForces,
    state: "afterAnswer",
  },
];

const container = document.querySelector<HTMLDivElement>("#stage");
const toggle = document.querySelector<HTMLButtonElement>("#toggle");
const errorText = document.querySelector<HTMLParagraphElement>("#error");
if (!container || !toggle || !errorText) {
  throw new Error("demo.html is missing #stage, #toggle or #error.");
}

const stage = new Konva.Stage({
  container,
  width: 2 * CELL_WIDTH,
  height: 2 * (CELL + TITLE_HEIGHT),
});
const layer = new Konva.Layer();
stage.add(layer);

const renderers = diagrams.map((diagram, index) => {
  const x = (index % 2) * CELL_WIDTH;
  const y = Math.floor(index / 2) * (CELL + TITLE_HEIGHT);
  layer.add(
    new Konva.Text({
      x: x + 10,
      y: y + 4,
      text: diagram.title,
      fontSize: 14,
      fontStyle: "bold",
      fill: "#162c34",
    }),
  );
  const group = new Konva.Group({ x: x + LABEL_MARGIN, y: y + TITLE_HEIGHT });
  layer.add(group);
  return new ForceRenderer(group, sampleDiagramOptions);
});

function draw(index: number, state: DiagramState): void {
  try {
    renderers[index].render(diagrams[index].forces, state);
  } catch (error) {
    errorText!.textContent = `Diagram ${index + 1}: ${(error as Error).message}`;
  }
}

diagrams.forEach((diagram, index) => draw(index, diagram.state));

// Redraws one diagram in place, so you can check the others don't change.
let pushedState: DiagramState = "beforeAnswer";
toggle.addEventListener("click", () => {
  pushedState = pushedState === "beforeAnswer" ? "afterAnswer" : "beforeAnswer";
  draw(2, pushedState);
  toggle.textContent =
    pushedState === "beforeAnswer"
      ? "Show pushed crate after answering"
      : "Show pushed crate before answering";
});
