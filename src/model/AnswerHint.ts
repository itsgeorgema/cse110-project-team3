import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "./AnswerValidator.ts";

export type MistakeType = "sign" | "decimal" | "miscalculation";

export interface AnswerHint {
  readonly kind: MistakeType;
  readonly message: string;
}

/** Only the parts of a level the hint maker needs. */
export type HintLevel = Pick<
  LevelDataConfig,
  "userInputVariables" | "expectedUserInput" | "toleranceRule"
>;

/** One strategy: "does this wrong answer look like this kind of mistake?" */
interface Detector {
  readonly kind: Exclude<MistakeType, "miscalculation">;
  matches(submitted: number, expected: number, allowedError: number): boolean;
}

const DECIMAL_SHIFTS = [0.001, 0.01, 0.1, 10, 100, 1000];

function isClose(value: number, target: number, allowedError: number) {
  return Math.abs(value - target) <= allowedError;
}

// Tried in order. To support a new mistake, add one entry here.
const DETECTORS: readonly Detector[] = [
  {
    kind: "sign",
    matches: (s, e, a) => isClose(s, -e, a),
  },
  {
    kind: "decimal",
    // expected 0 can't be "shifted", so skip it
    matches: (s, e, a) =>
      Math.abs(e) > a && DECIMAL_SHIFTS.some((f) => isClose(s, e * f, a * f)),
  },
];

export class HintFactory {
  // picks out what hint message to use for a kind of mistake
  public hintIdentifier(kind: MistakeType): AnswerHint | undefined {
    switch (kind) {
      case "sign":
        return { kind, message: "Check the sign of your answer." };
      case "decimal":
        return { kind, message: "Check where the decimal point goes." };
      case "miscalculation":
        return {
          kind,
          message:
            "You might've miscalculated something. Please check your work",
        };
      default:
        return undefined;
    }
  }

  /** Returns a hint for the first wrong field, or undefined if there is none. */
  public getAnswerHint(
    level: HintLevel,
    submission: Pick<AnswerSubmission, "values">,
  ): AnswerHint | undefined {
    for (const field of level.userInputVariables) {
      const expected = level.expectedUserInput[field];
      const submitted = submission.values[field];
      if (!Number.isFinite(submitted)) return undefined; // invalid input, not a wrong answer

      const { absolute, relative = 0 } = level.toleranceRule;
      const allowed = Math.max(absolute, relative * Math.abs(expected));
      if (isClose(submitted, expected, allowed)) continue; // this field is right

      const match = DETECTORS.find((d) =>
        d.matches(submitted, expected, allowed),
      );
      return match ? this.hintIdentifier(match.kind) : undefined;
    }
    return undefined; // everything correct
  }
}
