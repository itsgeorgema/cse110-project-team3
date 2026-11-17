import { describe, expect, it, vi } from "vitest";
import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type {
  AnswerSubmission,
  AnswerValidationResult,
} from "../model/AnswerValidator.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import { snapshotState } from "../model/SimulationState.ts";
import type { SimulationState } from "../model/SimulationState.ts";
import { FakeAnimationEngine } from "../view/animation/FakeAnimationEngine.ts";
import type { AnimationEngine } from "../view/animation/AnimationEngine.ts";
import { PlaybackListeners } from "../view/animation/PlaybackListeners.ts";
import { GameController } from "./GameController.ts";
import type { RunBuilder } from "./GameController.ts";

const level: LevelDataConfig = {
  gameId: "kinematics",
  levelId: 1,
  problemStatement: "What is the velocity?",
  problemStatementVariables: [],
  problemStatementVariablesValues: {},
  userInputVariables: ["velocity"],
  userInputVariablesUnits: { velocity: "m/s" },
  expectedUserInput: { velocity: 12 },
  toleranceRule: { absolute: 0.01 },
  bounds: { velocity: { min: 0 } },
};

const correctInput = {
  gameId: "kinematics",
  levelId: 1,
  fields: { velocity: "12" },
};

const frames: SimulationState[] = [0, 1].map((step) =>
  snapshotState(step, step * 16, [
    { id: "car", position: { x: step * 12, y: 0 }, angle: 0 },
  ]),
);

/**
 * An engine whose playback finishes only when the test says so, like a real
 * animation. Uses the shared PlaybackListeners so stop() stays silent.
 */
class ManualAnimationEngine implements AnimationEngine {
  private readonly listeners = new PlaybackListeners();
  private last: readonly SimulationState[] | undefined;
  readonly played: (readonly SimulationState[])[] = [];

  play(states: readonly SimulationState[]): void {
    this.last = states;
    this.played.push(states);
    this.listeners.start();
  }

  stop(): void {
    this.listeners.stop();
  }

  replay(): void {
    if (this.last !== undefined) this.play(this.last);
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.listeners.add(listener);
  }

  /** Reaches the last frame of the current playback. */
  finish(): void {
    this.listeners.finish();
  }
}

function setupController(
  animation: AnimationEngine = new FakeAnimationEngine(),
  buildRun: RunBuilder = () => frames,
) {
  const validator = new DefaultAnswerValidator();
  const validateAnswer = vi.spyOn(validator, "validateAnswer");
  const showInputErrors = vi.fn();
  const onAnswerValidated = vi.fn<(result: AnswerValidationResult) => void>();
  const buildRunSpy = vi.fn(buildRun);
  const progress = { recordAttempt: vi.fn() };
  const controller = new GameController(
    level,
    showInputErrors,
    validator,
    onAnswerValidated,
    { animation, buildRun: buildRunSpy, progress },
  );

  return {
    controller,
    validateAnswer,
    showInputErrors,
    onAnswerValidated,
    buildRun: buildRunSpy,
    progress,
  };
}

function manualSetup(buildRun?: RunBuilder) {
  const animation = new ManualAnimationEngine();
  return { animation, ...setupController(animation, buildRun) };
}

describe("GameController steps 1-3: parse and validate", () => {
  it("reports invalid text before calling the validator", () => {
    const {
      controller,
      validateAnswer,
      showInputErrors,
      onAnswerValidated,
      buildRun,
      progress,
    } = setupController();

    controller.submitAnswer({ ...correctInput, fields: { velocity: "abc" } });

    expect(showInputErrors).toHaveBeenCalledWith({
      velocity: expect.any(String),
    });
    expect(validateAnswer).not.toHaveBeenCalled();
    expect(onAnswerValidated).not.toHaveBeenCalled();
    expect(buildRun).not.toHaveBeenCalled();
    expect(progress.recordAttempt).not.toHaveBeenCalled();
  });

  it("adds units and forwards the validation result", () => {
    const { controller, validateAnswer, showInputErrors, onAnswerValidated } =
      setupController();

    controller.submitAnswer(correctInput);

    const submission = {
      gameId: "kinematics",
      levelId: 1,
      values: { velocity: 12 },
      units: { velocity: "m/s" },
    };

    expect(validateAnswer).toHaveBeenCalledWith(submission, level);
    expect(showInputErrors).not.toHaveBeenCalled();
    expect(onAnswerValidated).toHaveBeenCalledWith(
      expect.objectContaining({ submittedAnswer: submission, correct: true }),
    );
  });
});

describe("GameController step 4: playback", () => {
  it("builds the run from the submission and plays its frames", () => {
    const { animation, controller, buildRun } = manualSetup();

    controller.submitAnswer(correctInput);

    const submission: AnswerSubmission = {
      gameId: "kinematics",
      levelId: 1,
      values: { velocity: 12 },
      units: { velocity: "m/s" },
    };
    expect(buildRun).toHaveBeenCalledWith(submission, level);
    expect(animation.played).toEqual([frames]);
  });

  it("plays wrong answers too, so the player sees what their numbers did", () => {
    const { animation, controller, onAnswerValidated } = manualSetup();

    controller.submitAnswer({ ...correctInput, fields: { velocity: "3" } });

    expect(onAnswerValidated).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false }),
    );
    expect(animation.played).toHaveLength(1);
  });

  it("shows feedback before playback starts", () => {
    const order: string[] = [];
    const animation = new ManualAnimationEngine();
    const play = animation.play.bind(animation);
    animation.play = (states) => {
      order.push("play");
      play(states);
    };
    const { controller, onAnswerValidated } = setupController(animation);
    onAnswerValidated.mockImplementation(() => order.push("feedback"));

    controller.submitAnswer(correctInput);

    expect(order).toEqual(["feedback", "play"]);
  });

  it("records nothing and plays nothing if the run cannot be built", () => {
    const { animation, controller, progress } = manualSetup(() => {
      throw new RangeError("bad scene");
    });

    expect(() => controller.submitAnswer(correctInput)).toThrow(RangeError);
    animation.finish();

    expect(animation.played).toEqual([]);
    expect(progress.recordAttempt).not.toHaveBeenCalled();
  });
});

describe("GameController step 5: record after playback", () => {
  it("records the attempt only when playback finishes", () => {
    const { animation, controller, progress, onAnswerValidated } =
      manualSetup();

    controller.submitAnswer(correctInput);
    expect(progress.recordAttempt).not.toHaveBeenCalled();

    animation.finish();

    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt).toHaveBeenCalledWith(
      onAnswerValidated.mock.calls[0]?.[0],
    );
  });

  it("records wrong answers too", () => {
    const { animation, controller, progress } = manualSetup();

    controller.submitAnswer({ ...correctInput, fields: { velocity: "3" } });
    animation.finish();

    expect(progress.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false }),
    );
  });

  it("does not record again when the same run is replayed", () => {
    const { animation, controller, progress } = manualSetup();

    controller.submitAnswer(correctInput);
    animation.finish();
    animation.replay();
    animation.finish();

    expect(animation.played).toHaveLength(2);
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("records each new answer once, in order", () => {
    const { animation, controller, progress } = manualSetup();

    controller.submitAnswer({ ...correctInput, fields: { velocity: "3" } });
    animation.finish();
    controller.submitAnswer(correctInput);
    animation.finish();

    const recorded = progress.recordAttempt.mock.calls.map(
      ([result]) => (result as AnswerValidationResult).correct,
    );
    expect(recorded).toEqual([false, true]);
  });

  it("records only the latest answer if a new one interrupts playback", () => {
    const { animation, controller, progress } = manualSetup();

    controller.submitAnswer({ ...correctInput, fields: { velocity: "3" } });
    controller.submitAnswer(correctInput);
    animation.finish();

    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true }),
    );
  });

  it("records nothing when an input error follows a playback", () => {
    const { animation, controller, progress } = manualSetup();

    controller.submitAnswer(correctInput);
    animation.finish();
    controller.submitAnswer({ ...correctInput, fields: { velocity: "abc" } });
    animation.finish();

    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("records once with the FakeAnimationEngine, which finishes right away", () => {
    const { controller, progress } = setupController(new FakeAnimationEngine());

    controller.submitAnswer(correctInput);

    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("stops playback and records nothing after dispose", () => {
    const { animation, controller, progress } = manualSetup();
    const stop = vi.spyOn(animation, "stop");

    controller.submitAnswer(correctInput);
    controller.dispose();
    animation.finish();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt).not.toHaveBeenCalled();
  });

  it("unsubscribes from playback events on dispose", () => {
    const animation = new ManualAnimationEngine();
    const unsubscribe = vi.fn();
    vi.spyOn(animation, "onPlaybackFinished").mockReturnValue(unsubscribe);
    const { controller } = setupController(animation);

    controller.dispose();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
