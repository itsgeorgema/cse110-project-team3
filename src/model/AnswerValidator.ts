/**
 * Proposed validation contracts for #40. See docs/answer-validation.md for more information.
 * No validator implementation is provided in this change.
 */

/** The AnswerSubmission proposed in #25. */
export interface ValidationSubmission {
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

/** Validation-related configuration of the active problem. */
export interface AnswerValidationConfig {
  readonly gameId: string;
  readonly levelId: number;
  readonly inputVariables: readonly string[];
  readonly expectedUserInput: Readonly<Record<string, number>>;
  readonly toleranceRule: ToleranceRule;
  readonly bounds?: Readonly<Record<string, AnswerBounds>>;
}

/** Proposed validation fields of AttemptResult; no simulation outcome is added. */
export interface AnswerValidationResult {
  readonly submittedAnswer: ValidationSubmission;
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
    input: ValidationSubmission,
    level: AnswerValidationConfig,
  ): boolean;

  /** Checks input and compares all required answers with the configured tolerance. */
  validateAnswer(
    input: ValidationSubmission,
    level: AnswerValidationConfig,
  ): AnswerValidationResult;
}
