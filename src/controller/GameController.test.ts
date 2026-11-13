import { expect, it, vi } from "vitest";
import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import { GameController } from "./GameController.ts";

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

function setupController() {
  const validator = new DefaultAnswerValidator();
  const validateAnswer = vi.spyOn(validator, "validateAnswer");
  const showInputErrors = vi.fn();
  const onAnswerValidated = vi.fn();
  const controller = new GameController(
    level,
    showInputErrors,
    validator,
    onAnswerValidated,
  );

  return { controller, validateAnswer, showInputErrors, onAnswerValidated };
}

it("reports invalid text before calling the validator", () => {
  const { controller, validateAnswer, showInputErrors, onAnswerValidated } =
    setupController();

  controller.submitAnswer({
    gameId: "kinematics",
    levelId: 1,
    fields: { velocity: "abc" },
  });

  expect(showInputErrors).toHaveBeenCalledWith({
    velocity: expect.any(String),
  });
  expect(validateAnswer).not.toHaveBeenCalled();
  expect(onAnswerValidated).not.toHaveBeenCalled();
});

it("adds units and forwards the validation result", () => {
  const { controller, validateAnswer, showInputErrors, onAnswerValidated } =
    setupController();

  controller.submitAnswer({
    gameId: "kinematics",
    levelId: 1,
    fields: { velocity: "12" },
  });

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
