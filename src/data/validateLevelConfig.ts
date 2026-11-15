import type { LevelDataConfig } from "./LevelDataConfig.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isVariableList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isText) &&
    new Set(value).size === value.length
  );
}

function hasExactKeys(
  record: Record<string, unknown>,
  keys: string[],
): boolean {
  return (
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
  );
}

/**
 * Runtime boundary for generated or externally supplied level data.
 * Reports a developer-facing reason; the loader decides what players see.
 * This checks the format and internal consistency, not the physics solution.
 */
export function assertLevelConfig(
  value: unknown,
): asserts value is LevelDataConfig {
  if (!isRecord(value)) throw new Error("Level config must be an object");
  if (
    !isText(value.gameId) ||
    !Number.isSafeInteger(value.levelId) ||
    (value.levelId as number) < 1
  ) {
    throw new Error("Level identity must have a gameId and positive levelId");
  }
  if (!isText(value.problemStatement)) {
    throw new Error("Level must have a problem statement");
  }

  const variables = value.problemStatementVariables;
  const values = value.problemStatementVariablesValues;
  if (
    !isVariableList(variables) ||
    !isRecord(values) ||
    !hasExactKeys(values, variables) ||
    !Object.values(values).every(isFiniteNumber)
  ) {
    throw new Error("Problem variables must have matching finite values");
  }

  const inputs = value.userInputVariables;
  const units = value.userInputVariablesUnits;
  const answers = value.expectedUserInput;
  if (
    !isVariableList(inputs) ||
    inputs.length === 0 ||
    !isRecord(units) ||
    !hasExactKeys(units, inputs) ||
    !Object.values(units).every((unit) => typeof unit === "string") ||
    !isRecord(answers) ||
    !hasExactKeys(answers, inputs) ||
    !Object.values(answers).every(isFiniteNumber)
  ) {
    // Empty unit strings are valid for dimensionless answers.
    throw new Error(
      "Answer fields must have matching units and finite answers",
    );
  }

  const tolerance = value.toleranceRule;
  if (
    !isRecord(tolerance) ||
    !isFiniteNumber(tolerance.absolute) ||
    tolerance.absolute < 0 ||
    (tolerance.relative !== undefined &&
      (!isFiniteNumber(tolerance.relative) || tolerance.relative < 0))
  ) {
    throw new Error("Tolerances must be finite and nonnegative");
  }

  if (!isRecord(value.bounds)) throw new Error("Bounds must be an object");
  for (const [field, bounds] of Object.entries(value.bounds)) {
    if (!inputs.includes(field) || !isRecord(bounds)) {
      throw new Error("Bounds must refer to answer fields");
    }
    const { min, max } = bounds;
    if (
      (min !== undefined && !isFiniteNumber(min)) ||
      (max !== undefined && !isFiniteNumber(max))
    ) {
      throw new Error("Bounds must be finite when supplied");
    }
    const expected = answers[field] as number;
    if (
      (min !== undefined && max !== undefined && min > max) ||
      (min !== undefined && expected < min) ||
      (max !== undefined && expected > max)
    ) {
      throw new Error("Bounds must be ordered and contain the expected answer");
    }
  }
}
