import type {
  AnswerSubmission,
  LevelDataConfig,
} from "../model/AnswerValidator.ts";
import type { RawInput } from "./GameCommands.ts";

/** An AnswerSubmission before the controller adds units from the level. */
export type ParsedInput = Pick<AnswerSubmission, "gameId" | "levelId" | "values">;

export type ParseResult =
  | { readonly ok: true; readonly input: ParsedInput }
  /** One message per rejected field, keyed by inputVariables. */
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

/** Optional minus, digits with an optional decimal point, optional exponent: 9.8, -0.5, 3e8. */
const NUMBER_PATTERN = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/**
 * Turns what the player typed into finite numbers, or rejects it.
 * Bounds and correctness are AnswerValidator's job, not this one's.
 */
export function parseInput(
  raw: RawInput,
  level: Pick<LevelDataConfig, "inputVariables">,
): ParseResult {
  const values: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const name of level.inputVariables) {
    const text = (raw.fields[name] ?? "").trim();
    if (text === "") {
      errors[name] = "Enter a number.";
    } else if (!NUMBER_PATTERN.test(text)) {
      errors[name] = "Use digits, like 9.8 or 3e8.";
    } else if (!Number.isFinite(Number(text))) {
      errors[name] = "That number is too large.";
    } else {
      values[name] = Number(text);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    input: { gameId: raw.gameId, levelId: raw.levelId, values },
  };
}
