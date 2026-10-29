import { describe, expect, it } from "vitest";
import type { RawInput } from "./GameCommands.ts";
import { parseInput } from "./parseInput.ts";

const oneField = { inputVariables: ["speed"] };
const twoFields = { inputVariables: ["speed", "angle"] };

function raw(fields: Record<string, string>): RawInput {
  return { gameId: "car", levelId: 1, fields };
}

/** Parses one "speed" field and returns its value, or its error message. */
function parseSpeed(text: string): number | string {
  const result = parseInput(raw({ speed: text }), oneField);
  return result.ok ? result.input.values.speed : result.errors.speed;
}

describe("parseInput", () => {
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
    for (const text of ["abc", "12abc", "NaN", "Infinity", "0x10", "1,000", "+5", "1e"]) {
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
