/**
 * Proposed validation contracts for #40. See docs/answer-validation.md for more information.
 * No validator implementation is provided in this change.
 */

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
 * Minimal LevelDataConfig stub for interface review.
 * The physics/problem subteam will extend the full problem configuration.
 */
export interface LevelDataConfig {
  readonly gameId: string;
  readonly levelId: number;
  readonly inputVariables: readonly string[];
  readonly expectedUserInput: Readonly<Record<string, number>>;
  readonly toleranceRule: ToleranceRule;
  readonly bounds?: Readonly<Record<string, AnswerBounds>>;
}

/** Only the problem fields needed by the validator. */
export type AnswerValidationConfig = Pick<
  LevelDataConfig,
  | "gameId"
  | "levelId"
  | "inputVariables"
  | "expectedUserInput"
  | "toleranceRule"
  | "bounds"
>;

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
