import { describe, expect, it } from "vitest";
import { HintFactory, type HintLevel } from "./AnswerHint.ts";

const hints = new HintFactory();
const tolerance = { absolute: 0.00001 };

const kinematics3: HintLevel = {
  userInputVariables: ["acceleration"],
  expectedUserInput: { acceleration: 3 },
  toleranceRule: tolerance,
};

const netForce2: HintLevel = {
  userInputVariables: ["gravitationalForce", "normalForce", "netForce"],
  expectedUserInput: {
    gravitationalForce: 176.58,
    normalForce: 176.58,
    netForce: 0,
  },
  toleranceRule: tolerance,
};

const hintFor = (level: HintLevel, values: Record<string, number>) =>
  hints.getAnswerHint(level, { values })?.kind;

describe("hintIdentifier", () => {
  it.each(["sign", "decimal", "miscalculation"] as const)(
    "returns a message for %s",
    (kind) => {
      expect(hints.hintIdentifier(kind)?.kind).toBe(kind);
      expect(hints.hintIdentifier(kind)?.message).not.toBe("");
    },
  );
});

describe("getAnswerHint", () => {
  it("detects a flipped sign", () => {
    expect(hintFor(kinematics3, { acceleration: -3 })).toBe("sign");
  });

  it.each([30, 0.3])("detects a misplaced decimal: %s", (acceleration) => {
    expect(hintFor(kinematics3, { acceleration })).toBe("decimal");
  });

  it("gives no hint when the mistake is not recognized", () => {
    expect(hintFor(kinematics3, { acceleration: 15 })).toBeUndefined();
  });

  it("gives no hint for a correct answer", () => {
    expect(hintFor(kinematics3, { acceleration: 3 })).toBeUndefined();
  });

  it.each([NaN, Infinity])(
    "gives no hint for invalid input %s",
    (acceleration) => {
      expect(hintFor(kinematics3, { acceleration })).toBeUndefined();
    },
  );

  it("gives no hint when a field is missing", () => {
    expect(hintFor(kinematics3, {})).toBeUndefined();
  });

  it("hints at the wrong field in a multi-field level", () => {
    const right = {
      gravitationalForce: 176.58,
      normalForce: 176.58,
      netForce: 0,
    };
    expect(hintFor(netForce2, { ...right, normalForce: -176.58 })).toBe("sign");
    expect(hintFor(netForce2, { ...right, gravitationalForce: 1765.8 })).toBe(
      "decimal",
    );
    expect(hintFor(netForce2, { ...right, netForce: 353.16 })).toBeUndefined();
  });

  it("never gives a decimal hint when the expected answer is 0", () => {
    const right = { gravitationalForce: 176.58, normalForce: 176.58 };
    expect(hintFor(netForce2, { ...right, netForce: 0.005 })).toBeUndefined();
    expect(hintFor(netForce2, { ...right, netForce: -0 })).toBeUndefined();
  });

  it("respects relative tolerance", () => {
    const level: HintLevel = {
      userInputVariables: ["v"],
      expectedUserInput: { v: 12.5 },
      toleranceRule: { absolute: 0.1, relative: 0.01 },
    };
    expect(hintFor(level, { v: 12.55 })).toBeUndefined();
    expect(hintFor(level, { v: 125 })).toBe("decimal");
    expect(hintFor(level, { v: -12.5 })).toBe("sign");
  });

  it("never reveals the correct answer in a hint", () => {
    const hint = hints.getAnswerHint(kinematics3, {
      values: { acceleration: -3 },
    });
    expect(hint?.message).not.toContain("3");
  });
});
