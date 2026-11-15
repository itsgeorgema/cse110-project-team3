import {
  snapshotState,
  type SimulationState,
} from "../../model/SimulationState.ts";
import { KonvaStage } from "../KonvaStage.ts";
import { AnimationFactory } from "./AnimationFactory.ts";
import { animationRegistry } from "./animationRegistry.ts";
import { DEMO_BALL_ID } from "./DemoAnimation.ts";

// Dev-only page for #24 (open /demo.html under `npm run dev`; `vite build`
// ships only index.html). It wires the real factory, registry, KonvaBall and
// browser frame scheduler together, so DemoAnimation can be checked by eye.

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`demo.html is missing ${selector}`);
  return found;
}

/** A ball thrown across the stage: 2 s of frames at 60 steps per second. */
function throwFrames(width: number, height: number): SimulationState[] {
  const durationMs = 2000;
  const stepMs = 1000 / 60;
  const states: SimulationState[] = [];
  for (let step = 0; step * stepMs <= durationMs; step++) {
    const u = (step * stepMs) / durationMs;
    const x = 60 + (width - 120) * u;
    const y = height - 60 - (height - 120) * 4 * u * (1 - u);
    states.push(
      snapshotState(step, step * stepMs, [
        { id: DEMO_BALL_ID, position: { x, y }, angle: 0 },
      ]),
    );
  }
  return states;
}

const container = element<HTMLDivElement>("#stage");
const status = element<HTMLOutputElement>("#status");

const stage = new KonvaStage(container);
const engine = new AnimationFactory(animationRegistry).create("demo", stage);

let finishes = 0;
engine.onPlaybackFinished(() => {
  finishes++;
  status.textContent = `finished (heard ${finishes}×)`;
});

element<HTMLButtonElement>("#replay").addEventListener("click", () => {
  status.textContent = "playing";
  engine.replay();
});
element<HTMLButtonElement>("#stop").addEventListener("click", () => {
  status.textContent = "stopped";
  engine.stop();
});

status.textContent = "playing";
engine.play(throwFrames(container.clientWidth, container.clientHeight));
