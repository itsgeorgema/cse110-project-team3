import { afterEach, describe, expect, it, vi } from "vitest";
import { LevelDataConfigFactory } from "./LevelDataConfig.ts";
import { assertLevelConfig } from "./validateLevelConfig.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import { GameController } from "../controller/GameController.ts";
import { FakeAnimationEngine } from "../view/animation/FakeAnimationEngine.ts";

const factory = new LevelDataConfigFactory();
const validator = new DefaultAnswerValidator();
afterEach(() => vi.restoreAllMocks());

describe("net force level 1 (#18)", () => {
  it.each([
    [0, 5, 1, 5],
    [0.5, 18, 3, 54],
    [0.99999, 30, 5, 150],
  ])(
    "generates a physically specified crate problem at random=%s",
    (random, mass, acceleration, force) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const config = factory.createLevelDataConfig("netForce", 1);
      expect(() => assertLevelConfig(config)).not.toThrow();
      expect(config.problemStatementVariablesValues).toEqual({
        mass,
        acceleration,
      });
      expect(config.expectedUserInput).toEqual({ force });
      expect(config.userInputVariablesUnits).toEqual({ force: "N" });
      expect(config.problemStatement).toContain(`${mass} kg`);
      expect(config.problemStatement).toContain(`${acceleration} m/s^2`);
      expect(config.problemStatement).toContain("Ignore friction");
      expect(config.problemStatement).toContain("push is horizontal");
      expect(config.problemStatement).toContain("F = m*a");
    },
  );
});

{
  const gameId = "netForce";
  const levelId = 1;
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
