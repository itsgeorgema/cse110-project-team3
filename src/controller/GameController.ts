import type {
  AnswerSubmission,
  AnswerValidationResult,
  AnswerValidator,
} from "../model/AnswerValidator.ts";
import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { RawInput } from "./GameCommands.ts";
import { parseInput } from "./parseInput.ts";

export class GameController {
  private readonly level: LevelDataConfig;
  private readonly showInputErrors: (
    errors: Readonly<Record<string, string>>,
  ) => void;

  private readonly validator: AnswerValidator;
  private readonly onAnswerValidated: (result: AnswerValidationResult) => void;

  constructor(
    level: LevelDataConfig,
    showInputErrors: (errors: Readonly<Record<string, string>>) => void,
    validator: AnswerValidator,
    onAnswerValidated: (result: AnswerValidationResult) => void,
  ) {
    this.level = level;
    this.showInputErrors = showInputErrors;
    this.validator = validator;
    this.onAnswerValidated = onAnswerValidated;
  }

  submitAnswer(raw: RawInput): void {
    const parsed = parseInput(raw, this.level);

    if (!parsed.ok) {
      this.showInputErrors(parsed.errors);
      return;
    }
    const submission: AnswerSubmission = {
      ...parsed.input,
      units: this.level.userInputVariablesUnits,
    };

    const result = this.validator.validateAnswer(submission, this.level);
    this.onAnswerValidated(result);
  }
}
