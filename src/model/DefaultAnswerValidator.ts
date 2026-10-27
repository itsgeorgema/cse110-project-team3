import type {
  AnswerSubmission,
  AnswerValidationConfig,
  AnswerValidationResult,
  AnswerValidator,
} from "./AnswerValidator";

/** Numerical answer validation shared by both minigames. */
export class DefaultAnswerValidator implements AnswerValidator {
  validateInput(
    input: AnswerSubmission,
    level: AnswerValidationConfig,
  ): boolean {
    this.checkConfig(level);
    return this.inputFeedback(input, level) === undefined;
  }

  validateAnswer(
    input: AnswerSubmission,
    level: AnswerValidationConfig,
  ): AnswerValidationResult {
    this.checkConfig(level);
    const feedback = this.inputFeedback(input, level);
    if (feedback !== undefined) {
      return { submittedAnswer: input, correct: false, feedback };
    }

    // Check each submitted answer with the configured tolerance.
    const correct = level.inputVariables.every((field) => {
      const expected = level.expectedUserInput[field];
      const allowedError = Math.max(
        level.toleranceRule.absolute,
        (level.toleranceRule.relative ?? 0) * Math.abs(expected),
      );
      const actual = input.values[field];
      return actual >= expected - allowedError && actual <= expected + allowedError;
    });

    return {
      submittedAnswer: input,
      correct,
      feedback: correct ? "Correct!" : "Not quite. Check your answers and try again.",
    };
  }

  /**
   * Checks the validity of the input submission against the level configuration.
   * Returns a string describing the first problem found, or undefined if the input is valid.
   * This is used to provide feedback to the user.
   * It does not check the correctness of the answer, only that it is well-formed and within bounds defined by AnswerValidationConfig.
   */
  private inputFeedback(
    input: AnswerSubmission,
    level: AnswerValidationConfig,
  ): string | undefined {
    if (input.gameId !== level.gameId || input.levelId !== level.levelId) {
      return "This answer does not match the current game and level.";
    }

    for (const field of level.inputVariables) {
      if (!Object.hasOwn(input.values, field)) {
        return `Enter an answer for ${field}.`;
      }
      const value = input.values[field];
      if (!Number.isFinite(value)) {
        return `Enter a finite number for ${field}.`;
      }
      const bounds = level.bounds?.[field];
      if (bounds?.min !== undefined && value < bounds.min) {
        return `${field} must be at least ${bounds.min}.`;
      }
      if (bounds?.max !== undefined && value > bounds.max) {
        return `${field} must be at most ${bounds.max}.`;
      }
    }
    return undefined;
  }

  /** Checks the validity of the answer validation config.
   * Throws an error if the config is invalid.
   */
  private checkConfig(level: AnswerValidationConfig): void {
    const invalid = (reason: string): never => {
      throw new Error(`Invalid answer validation config: ${reason}`);
    };
    const { absolute, relative = 0 } = level.toleranceRule;
    if (
      !Number.isFinite(absolute) || absolute < 0 ||
      !Number.isFinite(relative) || relative < 0
    ) {
      invalid("tolerances must be finite and nonnegative.");
    }
    if (
      level.inputVariables.length === 0 ||
      new Set(level.inputVariables).size !== level.inputVariables.length
    ) {
      invalid("inputVariables must contain at least one field, with no duplicates.");
    }

    for (const field of level.inputVariables) {
      const expected = level.expectedUserInput[field];
      if (!Object.hasOwn(level.expectedUserInput, field) || !Number.isFinite(expected)) {
        invalid(`missing or nonfinite expected answer for ${field}.`);
      }
      if (!Number.isFinite(relative * Math.abs(expected))) {
        invalid(`relative tolerance overflows for ${field}.`);
      }
      const bounds = level.bounds?.[field];
      if (bounds?.min !== undefined && !Number.isFinite(bounds.min)) {
        invalid(`minimum for ${field} must be finite.`);
      }
      if (bounds?.max !== undefined && !Number.isFinite(bounds.max)) {
        invalid(`maximum for ${field} must be finite.`);
      }
      if (bounds?.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
        invalid(`minimum exceeds maximum for ${field}.`);
      }
    }
  }
}
