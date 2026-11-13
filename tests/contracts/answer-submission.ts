import { expectTypeOf } from "vitest";
import type {
  GameCommands,
  RawInput,
} from "../../src/controller/GameCommands.ts";
import type {
  ParsedInput,
  ParseResult,
} from "../../src/controller/parseInput.ts";
import type {
  AnswerSubmission,
  AnswerValidator,
  AnswerValidationConfig,
  AnswerValidationResult,
} from "../../src/model/AnswerValidator.ts";
import type { LevelDataConfig } from "../../src/data/LevelDataConfig.ts";
import type { LevelAddress } from "../../src/model/LevelAddress.ts";

// Compile-only boundary checks for #25 and #43, not a fake validator implementation.
expectTypeOf<RawInput>().toExtend<LevelAddress>();
expectTypeOf<ParsedInput>().toEqualTypeOf<
  Pick<AnswerSubmission, "gameId" | "levelId" | "values">
>();
expectTypeOf<GameCommands["submitAnswer"]>().parameters.toEqualTypeOf<
  [RawInput]
>();
expectTypeOf<GameCommands["saveDraft"]>().parameters.toEqualTypeOf<
  [RawInput]
>();
expectTypeOf<GameCommands["selectLevel"]>().parameters.toEqualTypeOf<
  [LevelAddress]
>();
expectTypeOf<
  AnswerValidator["validateAnswer"]
>().returns.toEqualTypeOf<AnswerValidationResult>();
expectTypeOf<
  AnswerValidationResult["submittedAnswer"]
>().toEqualTypeOf<AnswerSubmission>();
expectTypeOf<LevelDataConfig["userInputVariables"]>().toEqualTypeOf<
  readonly string[]
>();
// #75: a generated level goes to the validator as-is; bounds stay optional there.
expectTypeOf<LevelDataConfig>().toExtend<AnswerValidationConfig>();
const withoutBounds: AnswerValidationConfig = {
  gameId: "kinematics",
  levelId: 1,
  userInputVariables: ["velocity"],
  expectedUserInput: { velocity: 10 },
  toleranceRule: { absolute: 0 },
};
void withoutBounds;

declare const parsed: ParsedInput;
declare const submission: AnswerSubmission;
declare const result: ParseResult;

// Units must be attached by the controller before the model receives a submission.
// @ts-expect-error Parsed values alone are not a complete submission.
const missingUnits: AnswerSubmission = parsed;
void missingUnits;

// @ts-expect-error The model accepts numerical answers, not raw form strings.
const wrongValues: AnswerSubmission["values"] = { speed: "12" };
void wrongValues;

// @ts-expect-error Consumers cannot mutate submitted values through the contract.
submission.values.speed = 12;

if (result.ok) {
  expectTypeOf(result.input).toEqualTypeOf<ParsedInput>();
  // @ts-expect-error Successful parsing has no field errors.
  void result.errors;
} else {
  expectTypeOf(result.errors).toEqualTypeOf<Readonly<Record<string, string>>>();
  // @ts-expect-error Failed parsing must not expose a partial submission.
  void result.input;
}
