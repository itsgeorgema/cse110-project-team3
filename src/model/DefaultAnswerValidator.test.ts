import { describe, expect, it } from "vitest";
import type {
  AnswerSubmission,
  AnswerValidationConfig,
} from "./AnswerValidator";
import { DefaultAnswerValidator } from "./DefaultAnswerValidator";

const validator = new DefaultAnswerValidator();
const car: AnswerValidationConfig = {
  gameId: "carKinematics",
  levelId: 1,
  inputVariables: ["velocity"],
  expectedUserInput: { velocity: 12.5 },
  toleranceRule: { absolute: 0.1 },
  bounds: { velocity: { min: 0, max: 100 } },
};
const force: AnswerValidationConfig = {
  gameId: "netForce",
  levelId: 1,
  inputVariables: ["forceX", "forceY"],
  expectedUserInput: { forceX: -10, forceY: 0 },
  toleranceRule: { absolute: 0.1 },
};

function submission(
  level: AnswerValidationConfig,
  values: Readonly<Record<string, number>>,
): AnswerSubmission {
  return { gameId: level.gameId, levelId: level.levelId, values, units: {} };
}

// These are sample problem configurations, not production physics calculations.
describe.each([car, force])("$gameId", (level) => {
  it("accepts all expected answers and preserves the submission", () => {
    const input = submission(level, level.expectedUserInput);
    const result = validator.validateAnswer(input, level);
    expect(validator.validateInput(input, level)).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.submittedAnswer).toBe(input);
    expect(result.feedback).not.toBe("");
  });

  it("rejects a wrong answer even when other fields are correct", () => {
    const field = level.inputVariables[0];
    const input = submission(level, {
      ...level.expectedUserInput,
      [field]: level.expectedUserInput[field] + 1,
    });
    expect(validator.validateInput(input, level)).toBe(true);
    expect(validator.validateAnswer(input, level).correct).toBe(false);
  });

  it("rejects a missing required answer", () => {
    const input = submission(level, {});
    expect(validator.validateInput(input, level)).toBe(false);
    expect(validator.validateAnswer(input, level)).toMatchObject({
      correct: false,
      feedback: expect.stringContaining(level.inputVariables[0]),
    });
  });

  it.each([NaN, Infinity, -Infinity])("rejects nonfinite input %s", (value) => {
    const input = submission(level, {
      ...level.expectedUserInput,
      [level.inputVariables[0]]: value,
    });
    expect(validator.validateInput(input, level)).toBe(false);
    expect(validator.validateAnswer(input, level).correct).toBe(false);
  });
});

describe("input validation", () => {
  it.each([
    { gameId: "netForce", levelId: 1 },
    { gameId: "carKinematics", levelId: 2 },
  ])("rejects mismatched game or level: %j", (identity) => {
    const input = { ...submission(car, car.expectedUserInput), ...identity };
    expect(validator.validateInput(input, car)).toBe(false);
    expect(validator.validateAnswer(input, car).correct).toBe(false);
  });

  it.each([
    [0, true], [100, true], [-0.001, false], [100.001, false],
  ])("checks inclusive bounds for %s", (velocity, valid) => {
    const input = submission(car, { velocity });
    expect(validator.validateInput(input, car)).toBe(valid);
    if (!valid) expect(validator.validateAnswer(input, car).correct).toBe(false);
  });

  it("checks every required field in a multi-field answer", () => {
    const input = submission(force, { forceX: -10 });
    expect(validator.validateInput(input, force)).toBe(false);
    expect(validator.validateAnswer(input, force).feedback).toContain("forceY");
  });

  it("requires a correct answer for every field", () => {
    const input = submission(force, { forceX: -10, forceY: 1 });
    expect(validator.validateInput(input, force)).toBe(true);
    expect(validator.validateAnswer(input, force).correct).toBe(false);
  });

  it("applies bounds to later fields too", () => {
    const level = { ...force, bounds: { forceY: { max: 0 } } };
    expect(validator.validateInput(submission(level, { forceX: -10, forceY: 1 }), level))
      .toBe(false);
  });

  it("ignores extra fields and preserves fixed unit labels", () => {
    const input = {
      ...submission(car, { velocity: 12.5, extra: 99 }),
      units: { velocity: "m/s" },
    };
    const result = validator.validateAnswer(input, car);
    expect(result.correct).toBe(true);
    expect(result.submittedAnswer.units).toEqual({ velocity: "m/s" });
  });
});

describe("answer tolerance", () => {
  it.each([
    [12.4, true], [12.6, true], [12.399999, false], [12.600001, false],
  ])("checks decimal absolute tolerance endpoints for %s", (velocity, correct) => {
    expect(validator.validateAnswer(submission(car, { velocity }), car).correct)
      .toBe(correct);
  });

  it.each([
    [-11, true], [-9, true], [-11.001, false], [-8.999, false],
  ])("uses the magnitude of a negative expected answer: %s", (value, correct) => {
    const level = { ...force, toleranceRule: { absolute: 0.1, relative: 0.1 } };
    const input = submission(level, { forceX: value, forceY: 0 });
    expect(validator.validateAnswer(input, level).correct).toBe(correct);
  });

  it.each([[0.1, true], [-0.1, true], [0.100001, false]])(
    "uses absolute tolerance when the expected answer is zero: %s",
    (forceY, correct) => {
      const level = { ...force, toleranceRule: { absolute: 0.1, relative: 0.1 } };
      const input = submission(level, { forceX: -10, forceY });
      expect(validator.validateAnswer(input, level).correct).toBe(correct);
    },
  );

  it("chooses absolute tolerance when larger than relative tolerance", () => {
    const level = { ...car, toleranceRule: { absolute: 1, relative: 0.01 } };
    expect(validator.validateAnswer(submission(level, { velocity: 13.5 }), level).correct)
      .toBe(true);
  });

  it("requires exact answers when both tolerances are zero", () => {
    const level = { ...car, toleranceRule: { absolute: 0 } };
    expect(validator.validateAnswer(submission(level, { velocity: 12.5 }), level).correct)
      .toBe(true);
    expect(validator.validateAnswer(submission(level, { velocity: 12.500000000000002 }), level).correct)
      .toBe(false);
  });

  it("uses updated expected answers when a problem is regenerated", () => {
    const input = submission(car, { velocity: 12.5 });
    const regenerated = { ...car, expectedUserInput: { velocity: 20 } };
    expect(validator.validateAnswer(input, car).correct).toBe(true);
    expect(validator.validateAnswer(input, regenerated).correct).toBe(false);
  });
});

describe("invalid problem configuration", () => {
  const cases: [string, Partial<AnswerValidationConfig>][] = [
    ["negative absolute tolerance", { toleranceRule: { absolute: -0.1 } }],
    ["negative relative tolerance", { toleranceRule: { absolute: 0, relative: -0.1 } }],
    ["nonfinite absolute tolerance", { toleranceRule: { absolute: NaN } }],
    ["nonfinite relative tolerance", { toleranceRule: { absolute: 0, relative: Infinity } }],
    ["overflowing relative tolerance", { toleranceRule: { absolute: 0, relative: Number.MAX_VALUE } }],
    ["missing expected answer", { expectedUserInput: {} }],
    ["nonfinite expected answer", { expectedUserInput: { velocity: Infinity } }],
    ["no required fields", { inputVariables: [] }],
    ["duplicate fields", { inputVariables: ["velocity", "velocity"] }],
    ["reversed bounds", { bounds: { velocity: { min: 10, max: 0 } } }],
    ["nonfinite minimum", { bounds: { velocity: { min: NaN } } }],
    ["nonfinite maximum", { bounds: { velocity: { max: Infinity } } }],
  ];

  it.each(cases)("throws a developer error for %s", (_name, patch) => {
    const level = { ...car, ...patch };
    const input = submission(level, { velocity: 12.5 });
    expect(() => validator.validateInput(input, level)).toThrow("Invalid answer validation config");
    expect(() => validator.validateAnswer(input, level)).toThrow("Invalid answer validation config");
  });
});
