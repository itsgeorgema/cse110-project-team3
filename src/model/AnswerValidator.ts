/**
 * Validation contracts for #40. See docs/answer-validation.md for more information.
 * DefaultAnswerValidator provides the implementation.
 */

import type { LevelDataConfig } from "../data/LevelDataConfig";

/** The AnswerSubmission proposed in #25. */
export interface AnswerSubmission {
  readonly gameId: string;
  readonly levelId: number;
  readonly values: Readonly<Record<string, number>>;
  readonly units: Readonly<Record<string, string>>;
}

export interface ToleranceRule {
  readonly absolute: number;
  /** Fraction of the expected value: 0.01 means 1%. Defaults to zero. */
  readonly relative?: number;
}

export interface AnswerBounds {
  readonly min?: number;
  readonly max?: number;
}

/**
 * Only the problem fields needed by the validator, taken from LevelDataConfig.
 * Bounds stay optional here so a level without limits can still be validated.
 */
export type AnswerValidationConfig = Pick<
  LevelDataConfig,
  | "gameId"
  | "levelId"
  | "userInputVariables"
  | "expectedUserInput"
  | "toleranceRule"
> &
  Partial<Pick<LevelDataConfig, "bounds">>;

/** Proposed validation fields of AttemptResult; no simulation outcome is added. */
export interface AnswerValidationResult {
  readonly submittedAnswer: AnswerSubmission;
  readonly correct: boolean;
  readonly feedback: string;
}

/**
 * Contract for a model service called by the controller.
 * It does not parse text, calculate physics, draw the UI, or update progress.
 */
export interface AnswerValidator {
  /** Checks required fields, finite values, level identity, and inclusive bounds. */
  validateInput(
    input: AnswerSubmission,
    level: AnswerValidationConfig,
  ): boolean;

  /** Checks input and compares all required answers with the configured tolerance. */
  validateAnswer(
    input: AnswerSubmission,
    level: AnswerValidationConfig,
  ): AnswerValidationResult;
}
