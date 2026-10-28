import type { AnswerValidationResult } from "./AnswerValidator";

/** Session-only state. The controller records each result once, after playback. */
export class ProgressTracker {
  private readonly attempts: AnswerValidationResult[] = [];

  recordAttempt(result: AnswerValidationResult): void {
    const answer = result.submittedAnswer;
    const snapshot = Object.freeze({
      submittedAnswer: Object.freeze({
        ...answer,
        values: Object.freeze({ ...answer.values }),
        units: Object.freeze({ ...answer.units }),
      }),
      correct: result.correct,
      feedback: result.feedback,
    });
    this.attempts.push(snapshot);
  }

  /** A later failed replay never removes an earlier successful completion. */
  isCompleted(gameId: string, levelId: number): boolean {
    return this.attempts.some(attempt =>
      attempt.correct &&
      attempt.submittedAnswer.gameId === gameId &&
      attempt.submittedAnswer.levelId === levelId,
    );
  }

  getAttempts(): readonly AnswerValidationResult[] {
    return Object.freeze([...this.attempts]);
  }
}
