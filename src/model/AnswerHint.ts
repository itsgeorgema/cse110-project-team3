import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "./AnswerValidator.ts";

export type MistakeType = "sign" | "decimal" | "miscalculation";

export interface AnswerHint {
  readonly kind: MistakeType;
  readonly message: string;
}

export class HintFactory {
  // picks out what hint message to use for a kind of mistake
  public hintIdentifier(kind: MistakeType): AnswerHint | undefined {
    switch (kind) {
      case "sign":
        return { kind, message: "Check the sign of your answer." };
      case "decimal":
        return { kind, message: "Check where the decimal point goes." };
      case "miscalculation":
        return {kind, message: "You might've miscalculated something. Please check your work"}
      default:
        return undefined;
    }
  }
}

