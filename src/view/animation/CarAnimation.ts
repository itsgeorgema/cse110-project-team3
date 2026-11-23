import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState } from "../../model/SimulationState.ts";
import { CAR_ID } from "../../model/runs/kinematicsRun.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { FramePlayback } from "./FramePlayback.ts";
import { fitScale, toScreen, type WorldView } from "./worldToScreen.ts";

/** What the car scene needs drawn, already in stage pixels. */
export interface CarScene {
  readonly groundY: number;
  readonly startX: number;
  /** The gate the car must reach; undefined when the level has none. */
  readonly gateX: number | undefined;
  /** Text above the track, e.g. "10 m in 2 s". */
  readonly label: string;
}

/**
 * Where CarAnimation draws (Humble Object). KonvaCar is the real one; tests
 * record the calls instead, so no canvas is needed.
 */
export interface CarView {
  drawScene(scene: CarScene): void;
  /** Places the car's front bumper at this stage x, on the ground. */
  moveCar(x: number): void;
  /** Shows a verdict over the scene; undefined hides it. */
  showMessage(message: CarMessage | undefined): void;
}

export interface CarMessage {
  readonly text: string;
  readonly correct: boolean;
}

/** Empty track left after the gate, as a fraction of the gate distance. */
const RUN_OFF = 0.35;
/** Pixels kept clear at each side of the stage; the car fits in it at the start. */
const MARGIN = 56;
/** Height of the ground band at the bottom of the stage, in pixels. */
const GROUND = 28;

/** The gate distance in meters for the kinematics levels that have one. */
function gateDistance(level: LevelDataConfig): number | undefined {
  const { displacement } = level.problemStatementVariablesValues;
  return level.levelId === 1 && displacement > 0 ? displacement : undefined;
}

function sceneLabel(level: LevelDataConfig): string {
  const { displacement, time } = level.problemStatementVariablesValues;
  return level.levelId === 1 ? `${displacement} m in ${time} s` : "";
}

/** "4.7", "12", never "4.70" or "-0". */
function meters(value: number): string {
  return String(Math.round(Math.abs(value) * 10) / 10);
}

/**
 * The getaway car for Minigame 1 (#6, worked example for #116). Frames come
 * from buildKinematicsRun in meters with the car on y = 0; the car drives
 * right toward the gate. The verdict appears when the run ends: "Correct!" or
 * how far short of or past the gate the player's numbers put the car.
 */
export class CarAnimation implements AnimationEngine {
  private readonly view: CarView;
  private readonly stage: { readonly width: number; readonly height: number };
  private readonly playback: FramePlayback;
  private world: WorldView;
  private gate: number | undefined;
  private result: AnswerValidationResult | undefined;
  private lastCarX = 0;

  constructor(
    view: CarView,
    stage: { readonly width: number; readonly height: number },
    schedule: FrameScheduler,
  ) {
    this.view = view;
    this.stage = stage;
    this.world = this.worldFor(1);
    this.playback = new FramePlayback((state) => this.draw(state), schedule);
    // Subscribed first, so the verdict is on screen before anyone else hears.
    this.playback.onPlaybackFinished(() => this.showVerdict());
  }

  showLevel(level: LevelDataConfig): void {
    this.gate = gateDistance(level);
    this.result = undefined;
    this.world = this.worldFor((this.gate ?? 10) * (1 + RUN_OFF));
    const origin = this.world.origin;
    this.view.drawScene({
      groundY: origin.y,
      startX: origin.x,
      gateX:
        this.gate === undefined
          ? undefined
          : toScreen(this.world, { x: this.gate, y: 0 }).x,
      label: sceneLabel(level),
    });
    this.view.showMessage(undefined);
    this.placeCar(0);
  }

  showResult(result: AnswerValidationResult): void {
    this.result = result;
  }

  play(states: readonly SimulationState[]): void {
    this.view.showMessage(undefined);
    this.playback.play(states);
  }

  stop(): void {
    this.playback.stop();
  }

  replay(): void {
    this.view.showMessage(undefined);
    this.playback.replay();
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.playback.onPlaybackFinished(listener);
  }

  /** A world `trackLength` meters wide, ground near the bottom of the stage. */
  private worldFor(trackLength: number): WorldView {
    const scale = fitScale(
      { width: trackLength, height: trackLength / 4 },
      this.stage,
      MARGIN,
    );
    return {
      scale,
      origin: { x: MARGIN, y: this.stage.height - GROUND },
      yUp: true,
    };
  }

  private draw(state: SimulationState): void {
    const car = state.objects[CAR_ID];
    if (car !== undefined) this.placeCar(car.position.x);
  }

  /** Keeps the car on the stage even when the player's numbers overshoot it. */
  private placeCar(meters: number): void {
    this.lastCarX = meters;
    const x = toScreen(this.world, { x: meters, y: 0 }).x;
    this.view.moveCar(Math.min(Math.max(x, 0), this.stage.width));
  }

  private showVerdict(): void {
    const result = this.result;
    if (result === undefined) return;
    if (result.correct) {
      this.view.showMessage({ text: "Correct!", correct: true });
      return;
    }
    if (this.gate === undefined) {
      this.view.showMessage({ text: "Not quite", correct: false });
      return;
    }
    const gap = this.gate - this.lastCarX;
    const text =
      gap >= 0
        ? `Short by ${meters(gap)} m`
        : `Past the gate by ${meters(gap)} m`;
    this.view.showMessage({ text, correct: false });
  }
}
