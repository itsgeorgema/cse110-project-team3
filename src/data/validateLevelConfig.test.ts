import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LevelDataConfigFactory,
  type LevelDataConfig,
} from "./LevelDataConfig.ts";
import { assertLevelConfig } from "./validateLevelConfig.ts";

function fixture(): LevelDataConfig {
  return {
    gameId: "example",
    levelId: 1,
    problemStatement: "Find speed.",
    problemStatementVariables: ["distance"],
    problemStatementVariablesValues: { distance: 10 },
    userInputVariables: ["speed"],
    userInputVariablesUnits: { speed: "m/s" },
    expectedUserInput: { speed: 5 },
    toleranceRule: { absolute: 0.1 },
    bounds: { speed: { min: 0, max: 10 } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("assertLevelConfig", () => {
  it("rejects tolerance overflow before the answer validator receives the config", () => {
    expect(() =>
      assertLevelConfig({
        ...fixture(),
        expectedUserInput: { speed: Number.MAX_VALUE },
        bounds: {},
        toleranceRule: { absolute: 0, relative: 2 },
      }),
    ).toThrow("overflow");
  });
  it("accepts a valid config without changing it", () => {
    const config = fixture();
    const before = structuredClone(config);
    assertLevelConfig(config);
    expect(config).toEqual(before);
  });

  it.each([0, 0.5, 0.999999])(
    "accepts every registered factory level with random=%s",
    (random) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const factory = new LevelDataConfigFactory();
      for (const levelId of [1, 2, 3]) {
        assertLevelConfig(factory.createLevelDataConfig("kinematics", levelId));
      }
      assertLevelConfig(factory.createLevelDataConfig("netForce", 2));
    },
  );

  it.each([null, undefined, [], "config", 1])(
    "rejects non-object config %s",
    (value) => {
      expect(() => assertLevelConfig(value)).toThrow("must be an object");
    },
  );

  const invalid: [string, Record<string, unknown>][] = [
    ["blank game", { gameId: " " }],
    ["non-string game", { gameId: 1 }],
    ["zero level", { levelId: 0 }],
    ["fractional level", { levelId: 1.5 }],
    ["unsafe level", { levelId: Number.MAX_SAFE_INTEGER + 1 }],
    ["blank statement", { problemStatement: " " }],
    ["missing variables", { problemStatementVariables: null }],
    [
      "duplicate variables",
      { problemStatementVariables: ["distance", "distance"] },
    ],
    ["blank variable", { problemStatementVariables: [""] }],
    ["missing values", { problemStatementVariablesValues: null }],
    ["wrong value key", { problemStatementVariablesValues: { time: 10 } }],
    [
      "extra value",
      { problemStatementVariablesValues: { distance: 10, time: 2 } },
    ],
    [
      "nonfinite value",
      { problemStatementVariablesValues: { distance: Infinity } },
    ],
    ["invalid inputs", { userInputVariables: null }],
    ["empty inputs", { userInputVariables: [] }],
    ["missing units", { userInputVariablesUnits: null }],
    ["wrong units key", { userInputVariablesUnits: { distance: "m" } }],
    ["invalid unit", { userInputVariablesUnits: { speed: 1 } }],
    ["missing answers", { expectedUserInput: null }],
    ["missing answer key", { expectedUserInput: {} }],
    ["nonfinite answer", { expectedUserInput: { speed: NaN } }],
    ["missing tolerance", { toleranceRule: null }],
    ["nonfinite tolerance", { toleranceRule: { absolute: Infinity } }],
    ["negative tolerance", { toleranceRule: { absolute: -1 } }],
    ["negative relative", { toleranceRule: { absolute: 0, relative: -1 } }],
    ["nonfinite relative", { toleranceRule: { absolute: 0, relative: NaN } }],
    ["missing bounds", { bounds: null }],
    ["unknown bounds field", { bounds: { other: {} } }],
    ["invalid bounds object", { bounds: { speed: null } }],
    ["nonfinite min", { bounds: { speed: { min: -Infinity } } }],
    ["nonfinite max", { bounds: { speed: { max: Infinity } } }],
    ["reversed bounds", { bounds: { speed: { min: 8, max: 2 } } }],
    ["answer below min", { bounds: { speed: { min: 6 } } }],
    ["answer above max", { bounds: { speed: { max: 4 } } }],
  ];
  it.each(invalid)("rejects %s", (_name, overrides) => {
    expect(() => assertLevelConfig({ ...fixture(), ...overrides })).toThrow();
  });

  it("accepts multiple inputs, dimensionless units, zero tolerance and no problem variables", () => {
    assertLevelConfig({
      ...fixture(),
      problemStatementVariables: [],
      problemStatementVariablesValues: {},
      userInputVariables: ["speed", "ratio"],
      userInputVariablesUnits: { speed: "m/s", ratio: "" },
      expectedUserInput: { speed: 5, ratio: 0 },
      toleranceRule: { absolute: 0, relative: 0 },
      bounds: {},
    });
  });

  it.each([{}, { min: 5 }, { max: 5 }, { min: 5, max: 5 }])(
    "accepts optional and inclusive bounds %s",
    (bounds) => {
      assertLevelConfig({ ...fixture(), bounds: { speed: bounds } });
    },
  );

  it("rejects inherited values in place of own field values", () => {
    expect(() =>
      assertLevelConfig({
        ...fixture(),
        expectedUserInput: Object.create({ speed: 5 }) as unknown,
      }),
    ).toThrow();
  });
});
