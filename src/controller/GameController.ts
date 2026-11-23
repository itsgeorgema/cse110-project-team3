import type {
  AnswerSubmission,
  AnswerValidationResult,
  AnswerValidator,
} from "../model/AnswerValidator.ts";
import type { SimulationState } from "../model/SimulationState.ts";
import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { AnimationEngine } from "../view/animation/AnimationEngine.ts";
import type { RawInput } from "./GameCommands.ts";
import { parseInput } from "./parseInput.ts";

/** Records one finished attempt, e.g. ProgressController or ProgressTracker (#26). */
export interface AttemptRecorder {
  recordAttempt(result: AnswerValidationResult): void;
}

/**
 * Turns a submitted answer into the frames to play (#57). Each level supplies
 * one, usually by building a SimulationRequest and calling PhysicsEngine.simulate.
 */
export type RunBuilder = (
  submission: AnswerSubmission,
  level: LevelDataConfig,
) => readonly SimulationState[];

/** What GameController needs for steps 4-5 of #80. */
export interface PlaybackWiring {
  readonly animation: AnimationEngine;
  readonly buildRun: RunBuilder;
  readonly progress: AttemptRecorder;
}

export class GameController {
  private readonly level: LevelDataConfig;
  private readonly showInputErrors: (
    errors: Readonly<Record<string, string>>,
  ) => void;

  private readonly validator: AnswerValidator;
  private readonly onAnswerValidated: (result: AnswerValidationResult) => void;
  private readonly animation: AnimationEngine;
  private readonly buildRun: RunBuilder;
  private readonly progress: AttemptRecorder;
  private readonly unsubscribePlayback: () => void;

  /** The result waiting for its playback to finish. Cleared once recorded. */
  private pendingResult: AnswerValidationResult | undefined;

  constructor(
    level: LevelDataConfig,
    showInputErrors: (errors: Readonly<Record<string, string>>) => void,
    validator: AnswerValidator,
    onAnswerValidated: (result: AnswerValidationResult) => void,
    playback: PlaybackWiring,
  ) {
    this.level = level;
    this.showInputErrors = showInputErrors;
    this.validator = validator;
    this.onAnswerValidated = onAnswerValidated;
    this.animation = playback.animation;
    this.buildRun = playback.buildRun;
    this.progress = playback.progress;
    this.unsubscribePlayback = this.animation.onPlaybackFinished(() =>
      this.handlePlaybackFinished(),
    );
    this.animation.showLevel(level);
  }

  submitAnswer(raw: RawInput): void {
    const parsed = parseInput(raw, this.level);

    if (!parsed.ok) {
      this.showInputErrors(parsed.errors);
      return;
    }
    const submission: AnswerSubmission = {
      ...parsed.input,
      units: this.level.userInputVariablesUnits,
    };

    const result = this.validator.validateAnswer(submission, this.level);
    this.onAnswerValidated(result);

    // Step 4: play the player's numbers, right or wrong.
    const states = this.buildRun(submission, this.level);
    this.pendingResult = result;
    this.animation.showResult(result);
    this.animation.play(states);
  }

  /** Stops playback and listening. Call when leaving the level. */
  dispose(): void {
    this.animation.stop();
    this.unsubscribePlayback();
  }

  /**
   * Step 5: record the attempt once, when its playback finishes. A replay of
   * the same run, or a stopped playback, records nothing (#26).
   */
  private handlePlaybackFinished(): void {
    const result = this.pendingResult;
    if (result === undefined) return;
    this.pendingResult = undefined;
    this.progress.recordAttempt(result);
  }
}
