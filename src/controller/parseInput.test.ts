import { describe, expect, it } from "vitest";
import type { RawInput } from "./GameCommands.ts";
import { parseInput } from "./parseInput.ts";

const oneField = { userInputVariables: ["speed"] };
const twoFields = { userInputVariables: ["speed", "angle"] };

function raw(fields: Record<string, string>): RawInput {
  return { gameId: "car", levelId: 1, fields };
}

/** Parses one "speed" field and returns its value, or its error message. */
function parseSpeed(text: string): number | string {
  const result = parseInput(raw({ speed: text }), oneField);
  return result.ok ? result.input.values.speed : result.errors.speed;
}

describe("parseInput", () => {
  it.each([
    ["0", 0],
    ["-0", -0],
    ["12.", 12],
    ["1e+3", 1000],
    ["\t\n2.5\r\n", 2.5],
    ["1.7976931348623157e308", Number.MAX_VALUE],
    ["5e-324", Number.MIN_VALUE],
  ])("accepts finite decimal input %j", (text, expected) => {
    expect(parseSpeed(text)).toBe(expected);
  });

  it.each([
    "0b10",
    "0o10",
    "1_000",
    "12 m/s",
    "1 2",
    "1\n2",
    "1.2.3",
    "--2",
    ".",
    "true",
    "null",
    "１２",
    "<script>alert(1)</script>",
  ])("rejects non-decimal input %j", (text) => {
    expect(parseSpeed(text)).toBe("Use digits, like 9.8 or 3e8.");
  });

  it("reports every invalid field without exposing partial parsed values", () => {
    expect(
      parseInput(raw({ speed: "", angle: "1e999", time: "5" }), {
        userInputVariables: ["speed", "angle", "time"],
      }),
    ).toEqual({
      ok: false,
      errors: {
        speed: "Enter a number.",
        angle: "That number is too large.",
      },
    });
  });

  it("does not mutate raw fields or the level's input list", () => {
    const fields = Object.freeze({ speed: " 5 ", angle: "45" });
    const input = Object.freeze(raw(fields));
    const level = Object.freeze({
      userInputVariables: Object.freeze(["speed", "angle"]),
    });
    expect(parseInput(input, level)).toEqual({
      ok: true,
      input: { gameId: "car", levelId: 1, values: { speed: 5, angle: 45 } },
    });
    expect(input.fields).toEqual({ speed: " 5 ", angle: "45" });
    expect(level.userInputVariables).toEqual(["speed", "angle"]);
  });

  it("keeps games with the same level number distinct and calls independent", () => {
    const first = parseInput(raw({ speed: "5" }), oneField);
    const second = parseInput(
      { gameId: "netForce", levelId: 1, fields: { force: "20" } },
      { userInputVariables: ["force"] },
    );
    expect(first).toEqual({
      ok: true,
      input: { gameId: "car", levelId: 1, values: { speed: 5 } },
    });
    expect(second).toEqual({
      ok: true,
      input: { gameId: "netForce", levelId: 1, values: { force: 20 } },
    });
  });

  it("leaves bounds and answer correctness to the validator", () => {
    const level = {
      userInputVariables: ["speed"],
      expectedUserInput: { speed: 10 },
      toleranceRule: { absolute: 0.1 },
      bounds: { speed: { min: 0, max: 100 } },
    };
    expect(parseInput(raw({ speed: "-20" }), level)).toEqual({
      ok: true,
      input: { gameId: "car", levelId: 1, values: { speed: -20 } },
    });
  });

  it("accepts integers, decimals and negatives", () => {
    expect(parseSpeed("12")).toBe(12);
    expect(parseSpeed("9.8")).toBe(9.8);
    expect(parseSpeed("-0.5")).toBe(-0.5);
    expect(parseSpeed(".5")).toBe(0.5);
  });

  it("accepts scientific notation", () => {
    expect(parseSpeed("3e8")).toBe(300_000_000);
    expect(parseSpeed("1.5E-3")).toBe(0.0015);
  });

  it("trims spaces around the number", () => {
    expect(parseSpeed("  42 ")).toBe(42);
  });

  it("carries the level address through", () => {
    const result = parseInput(raw({ speed: "5" }), oneField);
    expect(result).toEqual({
      ok: true,
      input: { gameId: "car", levelId: 1, values: { speed: 5 } },
    });
  });

  it("rejects an empty or blank field", () => {
    expect(parseSpeed("")).toBe("Enter a number.");
    expect(parseSpeed("   ")).toBe("Enter a number.");
  });

  it("rejects a missing field", () => {
    const result = parseInput(raw({}), oneField);
    expect(result).toEqual({ ok: false, errors: { speed: "Enter a number." } });
  });

  it("rejects letters and text JavaScript would otherwise convert", () => {
    for (const text of [
      "abc",
      "12abc",
      "NaN",
      "Infinity",
      "0x10",
      "1,000",
      "+5",
      "1e",
    ]) {
      expect(parseSpeed(text), text).toBe("Use digits, like 9.8 or 3e8.");
    }
  });

  it("rejects numbers too large to be finite", () => {
    expect(parseSpeed("1e999")).toBe("That number is too large.");
    expect(parseSpeed("-1e999")).toBe("That number is too large.");
  });

  it("parses both fields of a two-field level", () => {
    const result = parseInput(raw({ speed: "20", angle: "45" }), twoFields);
    expect(result).toEqual({
      ok: true,
      input: { gameId: "car", levelId: 1, values: { speed: 20, angle: 45 } },
    });
  });

  it("reports only the bad field of a two-field level", () => {
    const result = parseInput(raw({ speed: "20", angle: "steep" }), twoFields);
    expect(result).toEqual({
      ok: false,
      errors: { angle: "Use digits, like 9.8 or 3e8." },
    });
  });

  it("ignores fields the level does not ask for", () => {
    const result = parseInput(raw({ speed: "5", extra: "oops" }), oneField);
    expect(result.ok && result.input.values).toEqual({ speed: 5 });
  });
});
