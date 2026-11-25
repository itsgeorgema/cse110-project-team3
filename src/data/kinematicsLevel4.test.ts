import { afterEach, describe, expect, it, vi } from "vitest";
import { LevelDataConfigFactory } from "./LevelDataConfig.ts";
import { assertLevelConfig } from "./validateLevelConfig.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import { GameController } from "../controller/GameController.ts";
import { FakeAnimationEngine } from "../view/animation/FakeAnimationEngine.ts";

const factory = new LevelDataConfigFactory();
const validator = new DefaultAnswerValidator();
afterEach(() => vi.restoreAllMocks());

describe("kinematics level 4 (#17)", () => {
  it.each([
    [0, 5, 1, 2, 6, 12],
    [0.5, 18, 3, 5, 25.5, 127.5],
    [0.99999, 30, 5, 7, 47.5, 332.5],
  ])(
    "generates consistent problems at random=%s",
    (
      random,
      initialVelocity,
      acceleration,
      time,
      averageVelocity,
      distance,
    ) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const config = factory.createLevelDataConfig("kinematics", 4);
      expect(() => assertLevelConfig(config)).not.toThrow();
      expect(config.problemStatementVariablesValues).toEqual({
        initialVelocity,
        acceleration,
        time,
      });
      expect(config.expectedUserInput).toEqual({ averageVelocity, distance });
      expect(config.userInputVariablesUnits).toEqual({
        averageVelocity: "m/s",
        distance: "m",
      });
      expect(config.problemStatement).toContain(`${initialVelocity} m/s`);
      expect(config.problemStatement).toContain(`${acceleration} m/s^2`);
      expect(config.problemStatement).toContain(`${time} seconds`);
      expect(config.problemStatement).toContain("v_avg = v_0 + a*t/2");
      expect(config.problemStatement).toContain("d = v_avg*t");
    },
  );
});

{
  const gameId = "kinematics";
  const levelId = 4;
  describe(`${gameId} ${levelId} answer integration`, () => {
    it("accepts generated answers and rejects each independently incorrect or missing field", () => {
      for (let i = 0; i < 100; i++) {
        const config = factory.createLevelDataConfig(gameId, levelId);
        expect(() => assertLevelConfig(config)).not.toThrow();
        const submit = (values: Record<string, number>) =>
          validator.validateAnswer(
            { gameId, levelId, values, units: config.userInputVariablesUnits },
            config,
          );
        expect(submit(config.expectedUserInput).correct).toBe(true);
        for (const field of config.userInputVariables) {
          expect(
            submit({
              ...config.expectedUserInput,
              [field]: config.expectedUserInput[field] + 1,
            }).correct,
          ).toBe(false);
          expect(
            submit({ ...config.expectedUserInput, [field]: -1 }).correct,
          ).toBe(false);
          const missing = { ...config.expectedUserInput };
          delete missing[field];
          expect(submit(missing).correct).toBe(false);
        }
      }
    });

    it("handles invalid input, a wrong answer, and correction through GameController", () => {
      const config = factory.createLevelDataConfig(gameId, levelId);
      const errors = vi.fn();
      const feedback = vi.fn();
      const recordAttempt = vi.fn();
      const controller = new GameController(
        config,
        errors,
        validator,
        feedback,
        {
          animation: new FakeAnimationEngine(),
          buildRun: () => [],
          progress: { recordAttempt },
        },
      );
      const fields = Object.fromEntries(
        Object.entries(config.expectedUserInput).map(([key, value]) => [
          key,
          String(value),
        ]),
      );
      const field = config.userInputVariables[0];
      controller.submitAnswer({
        gameId,
        levelId,
        fields: { ...fields, [field]: "letters" },
      });
      expect(errors).toHaveBeenLastCalledWith({
        [field]: "Use digits, like 9.8 or 3e8.",
      });
      expect(recordAttempt).not.toHaveBeenCalled();
      controller.submitAnswer({
        gameId,
        levelId,
        fields: {
          ...fields,
          [field]: String(config.expectedUserInput[field] + 1),
        },
      });
      expect(feedback).toHaveBeenLastCalledWith(
        expect.objectContaining({ correct: false }),
      );
      controller.submitAnswer({ gameId, levelId, fields });
      expect(feedback).toHaveBeenLastCalledWith(
        expect.objectContaining({ correct: true }),
      );
      expect(recordAttempt).toHaveBeenCalledTimes(2);
      controller.dispose();
    });
  });
}
