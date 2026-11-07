import { describe, it, expect, vi } from "vitest";
import { LevelDataConfigFactory } from "./LevelDataConfig";
import type { LevelDataConfig } from "./LevelDataConfig";

type GameId = "kinematics" | "netForce";

describe("createLevelDataConfig should handle invalid inputs", () => {
  it("createLevelDataConfig for nonExistent game, level 1 doesn't work", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "nonExistent";
    const levelId = 1;
    expect(() =>
      levelDataConfigFactory.createLevelDataConfig(gameId as GameId, levelId),
    ).toThrow("gameId does not exist");
  });

  it("createLevelDataConfig for kinematics game, level 10 doesn't work", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 10;
    expect(() =>
      levelDataConfigFactory.createLevelDataConfig(gameId, levelId),
    ).toThrow("levelId does not exist");
  });
});

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
      gameId: "kinematics",
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

describe("createLevelDataConfig for kinematics game, level 2", () => {
  const expectValidKinematicsLevel2Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    // Extract displacement and time from the problem statement.
    const velocityMatch = problemStatement.match(/in\s+(\d+)\s+m/);

    const timeMatch = problemStatement.match(/for\s+(\d+)\s+seconds/);

    expect(velocityMatch).not.toBeNull();
    expect(timeMatch).not.toBeNull();

    const velocity = Number(velocityMatch?.[1]);
    const time = Number(timeMatch?.[1]);
    const displacement = expectedUserInput.displacement;

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
      velocity,
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
      /^Displacement is velocity \(speed with direction\) multiplied by the time taken\. If a getaway car moves away from the guards in \d+ m\/s for \d+ seconds, what is the car's displacement\?$/,
    );

    // Ensure extracted values match the configuration.
    expect(problemStatement).toContain(`${velocity} m/s`);
    expect(problemStatement).toContain(`${time} seconds`);

    // Validate answer configuration.
    expect(expectedUserInput).toEqual({
      displacement,
    });
  };

  it("deterministic test: should generate valid and correctly formatted calculate displacement from velocity and time problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 2;

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

      const velocity =
        levelDataConfig.problemStatementVariablesValues["velocity"];
      const time = levelDataConfig.problemStatementVariablesValues["time"];
      expect(velocity).toBe(18);
      expect(time).toBe(5);

      console.log(levelDataConfig.problemStatement);

      expectValidKinematicsLevel2Problem(levelDataConfig);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("randomized tests (1000): should generate valid and correctly formatted calculate displacement from velocity and time problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 2;

    // Generate multiple configurations to cover random values.
    for (let i = 0; i < 1000; i++) {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );
      expectValidKinematicsLevel2Problem(levelDataConfig);
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 2;
    const config = levelDataConfigFactory.createLevelDataConfig(
      gameId,
      levelId,
    );

    expect(config).toMatchObject({
      gameId: "kinematics",
      levelId: 2,
      problemStatementVariables: ["velocity", "time"],
      userInputVariables: ["displacement"],
      userInputVariablesUnits: {
        displacement: "m",
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

describe("createLevelDataConfig for kinematics game, level 3", () => {
  const expectValidKinematicsLevel3Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    // Extract initial velocity, final velocity, and time from the problem statement.
    const initialVelocityMatch = problemStatement.match(/from\s+(\d+)\s+m\/s/);
    const finalVelocityMatch = problemStatement.match(/to\s+(\d+)\s+m\/s/);
    const timeMatch = problemStatement.match(/in\s+(\d+)\s+seconds/);

    expect(initialVelocityMatch).not.toBeNull();
    expect(finalVelocityMatch).not.toBeNull();
    expect(timeMatch).not.toBeNull();

    const initialVelocity = Number(initialVelocityMatch?.[1]);
    const finalVelocity = Number(finalVelocityMatch?.[1]);
    const time = Number(timeMatch?.[1]);
    const acceleration = expectedUserInput.acceleration;

    // Validate initial velocity.
    expect(Number.isInteger(initialVelocity)).toBe(true);
    expect(initialVelocity).toBeGreaterThanOrEqual(5);
    expect(initialVelocity).toBeLessThanOrEqual(30);

    // Validate time.
    expect(Number.isInteger(time)).toBe(true);
    expect(time).toBeGreaterThanOrEqual(2);
    expect(time).toBeLessThanOrEqual(7);

    // Validate final velocity (the car speeds up, so it exceeds the initial velocity).
    expect(Number.isInteger(finalVelocity)).toBe(true);
    expect(finalVelocity).toBeGreaterThan(initialVelocity);

    // Validate acceleration (a whole number from 1 to 5 m/s^2).
    expect(Number.isInteger(acceleration)).toBe(true);
    expect(acceleration).toBeGreaterThanOrEqual(1);
    expect(acceleration).toBeLessThanOrEqual(5);

    // Validate mathematical consistency.
    expect((finalVelocity - initialVelocity) % time).toBe(0);
    expect((finalVelocity - initialVelocity) / time).toBe(acceleration);

    // Validate problem statement variables.
    expect(problemStatementVariablesValues).toEqual({
      initialVelocity,
      finalVelocity,
      time,
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
      /^Acceleration is the rate of change\. That is, the change from initial velocity to the final velocity divided by time taken\. If a getaway car accelerates up from \d+ m\/s to \d+ m\/s in \d+ seconds to outrun the guard, what is the car's acceleration\?$/,
    );

    // Ensure extracted values match the configuration.
    expect(problemStatement).toContain(`${initialVelocity} m/s`);
    expect(problemStatement).toContain(`${finalVelocity} m/s`);
    expect(problemStatement).toContain(`${time} seconds`);

    // Validate answer configuration.
    expect(expectedUserInput).toEqual({
      acceleration,
    });
  };

  it("deterministic test: should generate valid and correctly formatted calculate acceleration from velocities and time problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 3;

    // Fix Math.random() to return 0.5 three times in a row
    // See LevelDataConfigFactory.randomIntegerInclusive() for implementation
    // of random integer generator for problem
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5) // initial velocity = Math.floor(0.5 * (30 - 5 + 1)) + 5 = 18
      .mockReturnValueOnce(0.5) // time = Math.floor(0.5 * (7 - 2 + 1)) + 2 = 5
      .mockReturnValueOnce(0.5); // acceleration = Math.floor(0.5 * (5 - 1 + 1)) + 1 = 3

    // Final velocity is then 18 + 3 * 5 = 33, so the expected acceleration is 3.

    try {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );

      const { initialVelocity, finalVelocity, time } =
        levelDataConfig.problemStatementVariablesValues;
      expect(initialVelocity).toBe(18);
      expect(finalVelocity).toBe(33);
      expect(time).toBe(5);
      expect(levelDataConfig.expectedUserInput.acceleration).toBe(3);

      expectValidKinematicsLevel3Problem(levelDataConfig);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("randomized tests (1000): should generate valid and correctly formatted calculate acceleration from velocities and time problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 3;

    // Generate multiple configurations to cover random values.
    for (let i = 0; i < 1000; i++) {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );
      expectValidKinematicsLevel3Problem(levelDataConfig);
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "kinematics";
    const levelId = 3;
    const config = levelDataConfigFactory.createLevelDataConfig(
      gameId,
      levelId,
    );

    expect(config).toMatchObject({
      gameId: "kinematics",
      levelId: 3,
      problemStatementVariables: ["initialVelocity", "finalVelocity", "time"],
      userInputVariables: ["acceleration"],
      userInputVariablesUnits: {
        acceleration: "m/s^2",
      },
      toleranceRule: {
        absolute: 0.00001,
      },
      bounds: {
        acceleration: {
          min: 0.0,
        },
      },
    });
  });
});

describe("createLevelDataConfig for net force game, level 2", () => {
  const expectValidNetForceLevel2Problem = (levelDataConfig: LevelDataConfig) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    // Extract mass and gravitational acceleration from the problem statement.
    const massMatch = problemStatement.match(/mass of (\d+) kg/);
    const gravityMatch = problemStatement.match(
      /gravity is (\d+(?:\.\d+)?) m\/s\^2/,
    );

    expect(massMatch).not.toBeNull();
    expect(gravityMatch).not.toBeNull();

    const mass = Number(massMatch?.[1]);
    const gravitationalAcceleration = Number(gravityMatch?.[1]);
    const { gravitationalForce, normalForce, netForce } = expectedUserInput;

    // Validate mass.
    expect(Number.isInteger(mass)).toBe(true);
    expect(mass).toBeGreaterThanOrEqual(5);
    expect(mass).toBeLessThanOrEqual(30);

    // Validate gravitational acceleration.
    expect(gravitationalAcceleration).toBe(9.81);

    // Validate physical consistency for a crate resting on level ground.
    expect(gravitationalForce).toBeCloseTo(
      mass * gravitationalAcceleration,
    
    );
    expect(normalForce).toBe(gravitationalForce);
    expect(netForce).toBe(0);

    // Validate problem statement variables.
    expect(problemStatementVariablesValues).toEqual({
      mass,
      gravitationalAcceleration,
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
      /^Net force is the sum of all the forces acting on an object\. A crate with a mass of \d+ kg rests on the ground\. Given that the acceleration from gravity is 9\.81 m\/s\^2, what are the gravitational force on the crate, the normal force from the ground, and the net force acting on the crate\?$/,
    );

    // Ensure extracted values match the configuration.
    expect(problemStatement).toContain(`${mass} kg`);
    expect(problemStatement).toContain(`${gravitationalAcceleration} m/s^2`);

    // Validate answer configuration: the student answers all three forces.
    expect(Object.keys(expectedUserInput).sort()).toEqual([
      "gravitationalForce",
      "netForce",
      "normalForce",
    ]);
  };

  it("deterministic test: should generate valid and correctly formatted calculate gravitational, normal, and net force problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "netForce";
    const levelId = 2;

    // Fix Math.random() to return 0.5 once
    // See LevelDataConfigFactory.randomIntegerInclusive() for implementation
    // of random integer generator for problem
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5); // mass = Math.floor(0.5 * (30 - 5 + 1)) + 5 = 18

    // Gravitational force is then 18 * 9.81 = 176.58 N, the normal force is
    // also 176.58 N, so the net force is 0 N.

    try {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );

      const { mass, gravitationalAcceleration } =
        levelDataConfig.problemStatementVariablesValues;
      expect(mass).toBe(18);
      expect(gravitationalAcceleration).toBe(9.81);
      expect(
        levelDataConfig.expectedUserInput.gravitationalForce,
      ).toBeCloseTo(176.58);
      expect(levelDataConfig.expectedUserInput.normalForce).toBeCloseTo(
        176.58,
        
      );
      expect(levelDataConfig.expectedUserInput.netForce).toBe(0);

      expectValidNetForceLevel2Problem(levelDataConfig);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("randomized tests (1000): should generate valid and correctly formatted calculate gravitational, normal, and net force problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "netForce";
    const levelId = 2;

    // Generate multiple configurations to cover random values.
    for (let i = 0; i < 1000; i++) {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        gameId,
        levelId,
      );
      expectValidNetForceLevel2Problem(levelDataConfig);
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "netForce";
    const levelId = 2;
    const config = levelDataConfigFactory.createLevelDataConfig(
      gameId,
      levelId,
    );

    expect(config).toMatchObject({
      gameId: "netForce",
      levelId: 2,
      problemStatementVariables: ["mass", "gravitationalAcceleration"],
      userInputVariables: ["gravitationalForce", "normalForce", "netForce"],
      userInputVariablesUnits: {
        gravitationalForce: "N",
        normalForce: "N",
        netForce: "N",
      },
      toleranceRule: {
        absolute: 0.00001,
      },
      bounds: {
        gravitationalForce: { min: 0.0 },
        normalForce: { min: 0.0 },
      },
    });
  });
});
