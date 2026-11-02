import { describe, it, expect, vi } from "vitest";
import { LevelDataConfigFactory } from "./LevelDataConfig";
import type { LevelDataConfig } from "./LevelDataConfig";

describe("createLevelDataConfig for kinematics game, level 1", () => {
  const expectValidKinematicsLevel1Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    // Extract displacement and time from the problem statement.
    const displacementMatch = problemStatement.match(/moves\s+(\d+)\s+meters/);

    const timeMatch = problemStatement.match(/in\s+(\d+)\s+seconds/);

    expect(displacementMatch).not.toBeNull();
    expect(timeMatch).not.toBeNull();

    const displacement = Number(displacementMatch?.[1]);
    const time = Number(timeMatch?.[1]);
    const velocity = expectedUserInput.velocity;

    // Validate velocity.
    expect(Number.isInteger(velocity)).toBe(true);
    expect(velocity).toBeGreaterThanOrEqual(5);
    expect(velocity).toBeLessThanOrEqual(30);

    // Validate time.
    expect(Number.isInteger(time)).toBe(true);
    expect(time).toBeGreaterThanOrEqual(2);
    expect(time).toBeLessThanOrEqual(7);

    // Validate displacement.
    expect(Number.isInteger(displacement)).toBe(true);
    expect(displacement).toBeGreaterThan(0);

    // Validate mathematical consistency.
    expect(displacement % time).toBe(0);
    expect(displacement / time).toBe(velocity);

    // Validate problem statement variables.
    expect(problemStatementVariablesValues).toEqual({
      time,
      displacement,
    });

    // Validate problem statement formatting.

    // Ensure there are no consecutive whitespace characters.
    expect(problemStatement).not.toMatch(/\s{2,}/);

    // Ensure the problem statement has no leading or trailing whitespace.
    expect(problemStatement).not.toMatch(/^\s|\s$/);

    // Ensure there is no whitespace before punctuation.
    expect(problemStatement).not.toMatch(/\s+[,.;:!?)}\]]/);

    // Validate problem statement wording and structure.
    expect(problemStatement).toMatch(
      /^Velocity is displacement \(the change in position from start to finish\) divided by the time taken\. If a getaway car moves \d+ meters straight toward the backstage gate in \d+ seconds, what is the car's velocity\?$/,
    );

    // Ensure extracted values match the configuration.
    expect(problemStatement).toContain(`${displacement} meters`);
    expect(problemStatement).toContain(`${time} seconds`);

    // Validate answer configuration.
    expect(expectedUserInput).toEqual({
      velocity,
    });
  };

  it("deterministic test: should generate valid and correctly formatted calculate velocity from displacement and time problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 1;

    // Fix Math.random() to return 0.5 twice in a row
    // See LevelDataConfigFactory.randomIntegerInclusive() for implementation
    // of random integer generator for problem
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5) // velocity = Math.floor(0.5 * (30 - 5 + 1)) + 5 = 18
      .mockReturnValueOnce(0.5); // time = Math.floor(0.5 * (7 - 2 + 1)) + 2 = 5

    // Displacement is then 18 * 5 = 90

    try {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );

      const displacement =
        levelDataConfig.problemStatementVariablesValues["displacement"];
      const time = levelDataConfig.problemStatementVariablesValues["time"];
      expect(displacement).toBe(90);
      expect(time).toBe(5);

      console.log(levelDataConfig.problemStatement);

      expectValidKinematicsLevel1Problem(levelDataConfig);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("randomized tests (1000): should generate valid and correctly formatted calculate velocity from displacement and time problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 1;

    // Generate multiple configurations to cover random values.
    for (let i = 0; i < 1000; i++) {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );
      expectValidKinematicsLevel1Problem(levelDataConfig);
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 1;
    const config = levelDataConfigFactory.createLevelDataConfig(
      gameId,
      levelId,
    );

    expect(config).toMatchObject({
      gameName: "kinematics",
      levelId: 1,
      problemStatementVariables: ["displacement", "time"],
      userInputVariables: ["velocity"],
      userInputVariablesUnits: {
        velocity: "m/s",
      },
      toleranceRule: {
        absolute: 0.00001,
      },
      bounds: {
        velocity: {
          min: 0.0,
        },
      },
    });
  });
});
