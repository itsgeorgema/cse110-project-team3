import { afterEach, describe, it, expect, vi } from "vitest";
import { LevelDataConfigFactory } from "./LevelDataConfig";
import type { LevelDataConfig } from "./LevelDataConfig";
import { assertLevelConfig } from "./validateLevelConfig";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator";

type GameId = Parameters<LevelDataConfigFactory["createLevelDataConfig"]>[0];

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

  it("createLevelDataConfig for netForce game, level 10 doesn't work", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();
    const gameId = "netForce";
    const levelId = 10;
    expect(() =>
      levelDataConfigFactory.createLevelDataConfig(gameId, levelId),
    ).toThrow("levelId does not exist");
  });

  it.each([0, 99])("rejects circularMotion level %s", (levelId) => {
    const levelDataConfigFactory = new LevelDataConfigFactory();

    expect(() =>
      levelDataConfigFactory.createLevelDataConfig("circularMotion", levelId),
    ).toThrow("levelId does not exist");
  });

  it.each([0, 3, 99])("rejects cannonTrajectory level %s", (levelId) => {
    expect(() =>
      new LevelDataConfigFactory().createLevelDataConfig(
        "cannonTrajectory",
        levelId,
      ),
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
        displacement: {
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
  const expectValidNetForceLevel2Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
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
    expect(gravitationalForce).toBeCloseTo(mass * gravitationalAcceleration);
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
      /^Net force is the vector sum of all forces acting on an object\. A crate with a mass of \d+ kg rests on the ground\. Given that the acceleration from gravity is 9\.81 m\/s\^2, what are the gravitational force on the crate, the normal force from the ground, and the net force acting on the crate\?$/,
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
      expect(levelDataConfig.expectedUserInput.gravitationalForce).toBeCloseTo(
        176.58,
      );
      expect(levelDataConfig.expectedUserInput.normalForce).toBeCloseTo(176.58);
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

describe("createLevelDataConfig for circular motion game, level 1", () => {
  const expectValidCircularMotionLevel1Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    const speedMatch = problemStatement.match(/speed of (\d+) m\/s/);
    const radiusMatch = problemStatement.match(/radius of (\d+) m\./);
    expect(speedMatch).not.toBeNull();
    expect(radiusMatch).not.toBeNull();

    const speed = Number(speedMatch?.[1]);
    const radius = Number(radiusMatch?.[1]);

    // Validate speed and radius.
    expect(Number.isInteger(speed)).toBe(true);
    expect(speed).toBeGreaterThanOrEqual(10);
    expect(speed).toBeLessThanOrEqual(40);
    expect(Number.isInteger(radius)).toBe(true);
    expect(radius).toBeGreaterThanOrEqual(5);
    expect(radius).toBeLessThanOrEqual(40);

    // Validate mathematical consistency: a = v^2 / r.
    expect(expectedUserInput.acceleration).toBeGreaterThan(0);
    expect(expectedUserInput.acceleration).toBeCloseTo(
      (speed * speed) / radius,
      6,
    );

    // Validate problem statement variables.
    expect(problemStatementVariablesValues).toEqual({ speed, radius });

    // Validate problem statement formatting.
    expect(problemStatement).not.toMatch(/\s{2,}/);
    expect(problemStatement).not.toMatch(/^\s|\s$/);
    expect(problemStatement).not.toMatch(/\s+[,.;:!?)}\]]/);

    // Validate problem statement wording and structure.
    expect(problemStatement).toMatch(
      /^When an object moves along a circle, its velocity keeps changing direction, so it is always accelerating toward the center of the circle\. This is called centripetal acceleration, and it equals the speed squared divided by the radius of the circle \(a = v\^2 \/ r\)\. A roller coaster travels at a speed of \d+ m\/s at the top of a loop with a radius of \d+ m\. What is the roller coaster's acceleration at the top of the loop\? Round your answer to two decimal places\.$/,
    );

    // Validate answer configuration.
    expect(Object.keys(expectedUserInput)).toEqual(["acceleration"]);
  };

  it("deterministic test: should generate valid and correctly formatted centripetal acceleration problems", () => {
    // Fix Math.random() to return 0.5 twice in a row
    // See LevelDataConfigFactory.randomIntegerInclusive() for implementation
    // of random integer generator for problem
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5) // speed = Math.floor(0.5 * (40 - 10 + 1)) + 10 = 25
      .mockReturnValueOnce(0.5); // radius = Math.floor(0.5 * (40 - 5 + 1)) + 5 = 23

    try {
      const levelDataConfig =
        new LevelDataConfigFactory().createLevelDataConfig("circularMotion", 1);

      expect(levelDataConfig.problemStatementVariablesValues).toEqual({
        speed: 25,
        radius: 23,
      });
      expect(levelDataConfig.expectedUserInput.acceleration).toBeCloseTo(
        625 / 23,
        6,
      );

      expectValidCircularMotionLevel1Problem(levelDataConfig);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it.each([
    { random: 0, speed: 10, radius: 5, acceleration: 20 },
    { random: 0.9999, speed: 40, radius: 40, acceleration: 40 },
  ])(
    "generates a valid problem at the range edge: $speed m/s on a $radius m loop",
    ({ random, speed, radius, acceleration }) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      try {
        const config = new LevelDataConfigFactory().createLevelDataConfig(
          "circularMotion",
          1,
        );

        expect(() => assertLevelConfig(config)).not.toThrow();
        expect(config.problemStatementVariablesValues).toEqual({
          speed,
          radius,
        });
        expect(config.expectedUserInput.acceleration).toBeCloseTo(
          acceleration,
          6,
        );
        expectValidCircularMotionLevel1Problem(config);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );

  it("randomized tests (1000): should generate valid and correctly formatted centripetal acceleration problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();

    for (let i = 0; i < 1000; i++) {
      expectValidCircularMotionLevel1Problem(
        levelDataConfigFactory.createLevelDataConfig("circularMotion", 1),
      );
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const config = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      1,
    );

    expect(config).toMatchObject({
      gameId: "circularMotion",
      levelId: 1,
      problemStatementVariables: ["speed", "radius"],
      userInputVariables: ["acceleration"],
      userInputVariablesUnits: { acceleration: "m/s^2" },
      toleranceRule: { absolute: 0.01 },
      bounds: { acceleration: { min: 0 } },
    });
  });

  it("accepts the exact answer and the answer rounded to two decimals", () => {
    const config = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      1,
    );
    const validator = new DefaultAnswerValidator();
    const submit = (acceleration: number) => ({
      gameId: config.gameId,
      levelId: config.levelId,
      values: { acceleration },
      units: config.userInputVariablesUnits,
    });
    const exact = config.expectedUserInput.acceleration;

    expect(validator.validateAnswer(submit(exact), config).correct).toBe(true);
    expect(
      validator.validateAnswer(submit(Number(exact.toFixed(2))), config)
        .correct,
    ).toBe(true);
    expect(validator.validateAnswer(submit(exact + 1), config).correct).toBe(
      false,
    );
  });
});

describe("createLevelDataConfig for circular motion game, level 3", () => {
  it.each([
    { random: 0, mass: 200, radius: 5 },
    { random: 0.5, mass: 350, radius: 10 },
    { random: 0.9999, mass: 500, radius: 15 },
  ])(
    "generates a valid loop problem with a radius of $radius m",
    ({ random, mass, radius }) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      try {
        const config = new LevelDataConfigFactory().createLevelDataConfig(
          "circularMotion",
          3,
        );
        const gravitationalAcceleration = 9.81;
        const minimumSpeed = Math.sqrt(gravitationalAcceleration * radius);

        expect(() => assertLevelConfig(config)).not.toThrow();
        expect(config).toMatchObject({
          gameId: "circularMotion",
          levelId: 3,
          problemStatementVariables: [
            "mass",
            "radius",
            "gravitationalAcceleration",
          ],
          problemStatementVariablesValues: {
            mass,
            radius,
            gravitationalAcceleration,
          },
          userInputVariables: ["minimumSpeed"],
          userInputVariablesUnits: { minimumSpeed: "m/s" },
          toleranceRule: { absolute: 0.01 },
          bounds: { minimumSpeed: { min: 0 } },
        });
        expect(config.problemStatement).toContain(`mass of ${mass} kg`);
        expect(config.problemStatement).toContain("speed of v m/s");
        expect(config.problemStatement).toContain(`radius of ${radius} m`);
        expect(config.problemStatement).toContain("9.81 m/s^2");
        expect(config.problemStatement).toContain(
          "normal force must be zero or positive",
        );
        expect(config.problemStatement).toContain(
          "net force at the top in terms of v",
        );
        expect(config.problemStatement).toContain(
          "the normal force is zero, so the net force equals the coaster's weight",
        );
        expect(config.problemStatement).toContain("minimum speed needed");
        expect(config.problemStatement).toContain("two decimal places");
        expect(config.expectedUserInput.minimumSpeed).toBeCloseTo(
          minimumSpeed,
          6,
        );

        const result = new DefaultAnswerValidator().validateAnswer(
          {
            gameId: config.gameId,
            levelId: config.levelId,
            values: { minimumSpeed: Number(minimumSpeed.toFixed(2)) },
            units: config.userInputVariablesUnits,
          },
          config,
        );
        expect(result.correct).toBe(true);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );
});

describe("createLevelDataConfig for cannon trajectory game, level 1", () => {
  const expectValidCannonTrajectoryLevel1Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    // Extract the given values from the problem statement.
    const speedMatch = problemStatement.match(/stuntman at (\d+) m\/s/);
    const angleMatch = problemStatement.match(/angle of (\d+) degrees/);
    const gravityMatch = problemStatement.match(
      /Gravity \((\d+(?:\.\d+)?) m\/s\^2\)/,
    );

    expect(speedMatch).not.toBeNull();
    expect(angleMatch).not.toBeNull();
    expect(gravityMatch).not.toBeNull();

    const launchSpeed = Number(speedMatch?.[1]);
    const launchAngle = Number(angleMatch?.[1]);
    const gravitationalAcceleration = Number(gravityMatch?.[1]);

    // Validate launch speed and angle.
    expect(Number.isInteger(launchSpeed)).toBe(true);
    expect(launchSpeed).toBeGreaterThanOrEqual(5);
    expect(launchSpeed).toBeLessThanOrEqual(20);
    expect(Number.isInteger(launchAngle)).toBe(true);
    expect(launchAngle).toBeGreaterThanOrEqual(5);
    expect(launchAngle).toBeLessThanOrEqual(30);
    expect(gravitationalAcceleration).toBe(9.81);

    // Validate the expected answers against the launch values.
    const radians = (launchAngle * Math.PI) / 180;
    const { initialHorizontalVelocity, initialVerticalVelocity } =
      expectedUserInput;
    expect(initialHorizontalVelocity).toBeCloseTo(
      launchSpeed * Math.cos(radians),
      6,
    );
    expect(initialVerticalVelocity).toBeCloseTo(
      launchSpeed * Math.sin(radians),
      6,
    );
    expect(expectedUserInput.horizontalVelocityRate).toBe(0);
    expect(expectedUserInput.verticalVelocityRate).toBe(
      gravitationalAcceleration,
    );

    // The two components should rebuild the launch speed.
    expect(
      Math.hypot(initialHorizontalVelocity, initialVerticalVelocity),
    ).toBeCloseTo(launchSpeed, 6);

    // Validate problem statement variables.
    expect(problemStatementVariablesValues).toEqual({
      launchSpeed,
      launchAngle,
      gravitationalAcceleration,
    });

    // Validate problem statement formatting.
    expect(problemStatement).not.toMatch(/\s{2,}/);
    expect(problemStatement).not.toMatch(/^\s|\s$/);
    expect(problemStatement).not.toMatch(/\s+[,.;:!?)}\]]/);

    // Validate problem statement wording and structure.
    expect(problemStatement).toMatch(
      /^Velocity tells you how fast something moves and in which direction\. A cannon launches a stuntman at \d+ m\/s at an angle of \d+ degrees above the ground\. Split this launch velocity into a horizontal part \(speed times cos of the angle\) and a vertical part \(speed times sin of the angle\)\. Nothing pushes the stuntman sideways, so the horizontal velocity does not change over time\. Gravity \(9\.81 m\/s\^2\) pulls downward, so the vertical velocity decreases by that amount every second\. Fill in the blanks for the velocity at time t, where t = 0 at launch: horizontal velocity = \[initial\] \+ \[rate\] \* t, vertical velocity = \[initial\] - \[rate\] \* t\. Round your answers to two decimal places\.$/,
    );

    // Validate answer configuration: the student fills in four blanks.
    expect(Object.keys(expectedUserInput).sort()).toEqual([
      "horizontalVelocityRate",
      "initialHorizontalVelocity",
      "initialVerticalVelocity",
      "verticalVelocityRate",
    ]);
  };

  it("deterministic test: should generate valid and correctly formatted launch velocity equation problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();

    // Fix Math.random() to return 0.5 twice in a row
    // See LevelDataConfigFactory.randomIntegerInclusive() for implementation
    // of random integer generator for problem
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5) // speed = Math.floor(0.5 * (20 - 5 + 1)) + 5 = 13
      .mockReturnValueOnce(0.5); // angle = Math.floor(0.5 * (30 - 5 + 1)) + 5 = 18

    try {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        "cannonTrajectory",
        1,
      );

      const { launchSpeed, launchAngle } =
        levelDataConfig.problemStatementVariablesValues;
      expect(launchSpeed).toBe(13);
      expect(launchAngle).toBe(18);

      expectValidCannonTrajectoryLevel1Problem(levelDataConfig);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it.each([
    { random: 0, launchSpeed: 5, launchAngle: 5 },
    { random: 0.9999, launchSpeed: 20, launchAngle: 30 },
  ])(
    "generates a valid problem at the range edge: $launchSpeed m/s at $launchAngle degrees",
    ({ random, launchSpeed, launchAngle }) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      try {
        const config = new LevelDataConfigFactory().createLevelDataConfig(
          "cannonTrajectory",
          1,
        );
        expect(config.problemStatementVariablesValues).toMatchObject({
          launchSpeed,
          launchAngle,
        });
        expect(() => assertLevelConfig(config)).not.toThrow();
        expectValidCannonTrajectoryLevel1Problem(config);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );

  it("randomized tests (1000): should generate valid and correctly formatted launch velocity equation problems", () => {
    const levelDataConfigFactory = new LevelDataConfigFactory();

    // Generate multiple configurations to cover random values.
    for (let i = 0; i < 1000; i++) {
      const levelDataConfig = levelDataConfigFactory.createLevelDataConfig(
        "cannonTrajectory",
        1,
      );
      expectValidCannonTrajectoryLevel1Problem(levelDataConfig);
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const config = new LevelDataConfigFactory().createLevelDataConfig(
      "cannonTrajectory",
      1,
    );

    expect(config).toMatchObject({
      gameId: "cannonTrajectory",
      levelId: 1,
      problemStatementVariables: [
        "launchSpeed",
        "launchAngle",
        "gravitationalAcceleration",
      ],
      userInputVariables: [
        "initialHorizontalVelocity",
        "horizontalVelocityRate",
        "initialVerticalVelocity",
        "verticalVelocityRate",
      ],
      toleranceRule: { absolute: 0.01 },
    });

    // toMatchObject ignores extra keys, so check these two exactly:
    // there must be a unit for every answer and nothing else.
    expect(config.userInputVariablesUnits).toEqual({
      initialHorizontalVelocity: "m/s",
      horizontalVelocityRate: "m/s^2",
      initialVerticalVelocity: "m/s",
      verticalVelocityRate: "m/s^2",
    });
    expect(config.bounds).toEqual({
      initialHorizontalVelocity: { min: 0 },
      initialVerticalVelocity: { min: 0 },
    });
  });

  it("accepts exact and two-decimal answers, and treats a flipped sign as wrong", () => {
    const validator = new DefaultAnswerValidator();
    const config = new LevelDataConfigFactory().createLevelDataConfig(
      "cannonTrajectory",
      1,
    );
    const submit = (values: Record<string, number>) => ({
      gameId: config.gameId,
      levelId: config.levelId,
      values,
      units: config.userInputVariablesUnits,
    });
    const rounded = Object.fromEntries(
      Object.entries(config.expectedUserInput).map(([name, value]) => [
        name,
        Number(value.toFixed(2)),
      ]),
    );

    expect(
      validator.validateAnswer(submit(config.expectedUserInput), config)
        .correct,
    ).toBe(true);
    expect(validator.validateAnswer(submit(rounded), config).correct).toBe(
      true,
    );

    // The rates are unbounded, so a flipped sign is valid input but wrong.
    const flippedRate = {
      ...config.expectedUserInput,
      verticalVelocityRate: -config.expectedUserInput.verticalVelocityRate,
    };
    expect(validator.validateInput(submit(flippedRate), config)).toBe(true);
    expect(validator.validateAnswer(submit(flippedRate), config).correct).toBe(
      false,
    );

    // The initial velocities are bounded, so a negative one is rejected.
    const negativeStart = {
      ...config.expectedUserInput,
      initialHorizontalVelocity:
        -config.expectedUserInput.initialHorizontalVelocity,
    };
    expect(validator.validateInput(submit(negativeStart), config)).toBe(false);
  });
});

describe("createLevelDataConfig for cannon trajectory game, level 2", () => {
  const createConfig = () =>
    new LevelDataConfigFactory().createLevelDataConfig("cannonTrajectory", 2);

  const expectValidCannonTrajectoryLevel2Problem = (
    levelDataConfig: LevelDataConfig,
  ) => {
    const {
      problemStatement,
      problemStatementVariablesValues,
      expectedUserInput,
    } = levelDataConfig;

    // Extract the given values from the problem statement.
    const speedMatch = problemStatement.match(/stuntman at (\d+) m\/s/);
    const angleMatch = problemStatement.match(/angle of (\d+) degrees/);
    const timeMatch = problemStatement.match(/to t = (\d+(?:\.\d)?) s,/);
    expect(speedMatch).not.toBeNull();
    expect(angleMatch).not.toBeNull();
    expect(timeMatch).not.toBeNull();
    const launchSpeed = Number(speedMatch?.[1]);
    const launchAngle = Number(angleMatch?.[1]);
    const time = Number(timeMatch?.[1]);
    const g = 9.81;

    expect(problemStatementVariablesValues).toEqual({
      launchSpeed,
      launchAngle,
      time,
      gravitationalAcceleration: g,
    });

    // Validate ranges: integer speed and angle, t in tenths of a second.
    expect(Number.isInteger(launchSpeed)).toBe(true);
    expect(launchSpeed).toBeGreaterThanOrEqual(10);
    expect(launchSpeed).toBeLessThanOrEqual(25);
    expect(Number.isInteger(launchAngle)).toBe(true);
    expect(launchAngle).toBeGreaterThanOrEqual(20);
    expect(launchAngle).toBeLessThanOrEqual(60);
    expect(time).toBeGreaterThanOrEqual(0.1);
    expect(time * 10).toBeCloseTo(Math.round(time * 10), 9);

    // t must be before landing, computed independently of PhysicsEngine.
    const radians = (launchAngle * Math.PI) / 180;
    const vx = launchSpeed * Math.cos(radians);
    const vy = launchSpeed * Math.sin(radians);
    expect(time).toBeLessThan((2 * vy) / g);

    // Validate expected answers against the kinematics equations.
    const finalVy = vy - g * time;
    expect(expectedUserInput.averageHorizontalVelocity).toBeCloseTo(vx, 6);
    expect(expectedUserInput.averageVerticalVelocity).toBeCloseTo(
      (vy + finalVy) / 2,
      6,
    );
    expect(expectedUserInput.horizontalDisplacement).toBeCloseTo(vx * time, 6);
    expect(expectedUserInput.verticalDisplacement).toBeCloseTo(
      vy * time - 0.5 * g * time * time,
      6,
    );
    expect(expectedUserInput.verticalDisplacement).toBeGreaterThan(0);

    // Validate problem statement formatting.
    expect(problemStatement).not.toMatch(/\s{2,}/);
    expect(problemStatement).not.toMatch(/^\s|\s$/);
    expect(problemStatement).not.toMatch(/\s+[,.;:!?)}\]]/);

    // Validate problem statement wording and structure.
    expect(problemStatement).toMatch(
      /^A cannon launches a stuntman at \d+ m\/s at an angle of \d+ degrees above the ground\. The initial horizontal velocity is speed times cos of the angle, and the initial vertical velocity is speed times sin of the angle\. When acceleration is constant, the average velocity over a time interval is the initial velocity plus the final velocity, divided by 2: average velocity = initial velocity \+ \(acceleration \* t\) \/ 2\. Nothing pushes the stuntman sideways, so the horizontal acceleration is 0\. Gravity \(9\.81 m\/s\^2\) pulls downward, so the vertical acceleration is -9\.81 m\/s\^2\. Displacement is the change in position: displacement = average velocity \* t\. From launch to t = \d+(\.\d)? s, what are the stuntman's average horizontal velocity, average vertical velocity, horizontal displacement \(delta x\), and vertical displacement \(delta y\)\? Round your answers to two decimal places\.$/,
    );

    expect(() => assertLevelConfig(levelDataConfig)).not.toThrow();
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deterministic test: generates the expected problem for fixed random values", () => {
    // speed = floor(0.5 * 16) + 10 = 18, angle = floor(0.5 * 41) + 20 = 40
    // flight time = 2 * 18 * sin(40) / 9.81 = 2.36 s, so t is 1 to 23 tenths
    // t = (floor(0.5 * 23) + 1) / 10 = 1.2 s
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const config = createConfig();

    expect(config.problemStatementVariablesValues).toEqual({
      launchSpeed: 18,
      launchAngle: 40,
      time: 1.2,
      gravitationalAcceleration: 9.81,
    });
    // Hand-computed answers, rounded to two decimals.
    expect(config.expectedUserInput.averageHorizontalVelocity).toBeCloseTo(
      13.79,
      2,
    );
    expect(config.expectedUserInput.averageVerticalVelocity).toBeCloseTo(
      5.68,
      2,
    );
    expect(config.expectedUserInput.horizontalDisplacement).toBeCloseTo(
      16.55,
      2,
    );
    expect(config.expectedUserInput.verticalDisplacement).toBeCloseTo(6.82, 2);
    expectValidCannonTrajectoryLevel2Problem(config);
  });

  it.each([
    // Shortest flight (about 0.70 s): t is the earliest tenth.
    { random: 0, launchSpeed: 10, launchAngle: 20, time: 0.1 },
    // Longest flight (about 4.41 s): t is the last tenth before landing.
    { random: 0.9999, launchSpeed: 25, launchAngle: 60, time: 4.4 },
  ])(
    "generates a valid problem at the range edge: $launchSpeed m/s, $launchAngle degrees, t = $time s",
    ({ random, launchSpeed, launchAngle, time }) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const config = createConfig();

      expect(config.problemStatementVariablesValues).toMatchObject({
        launchSpeed,
        launchAngle,
        time,
      });
      expectValidCannonTrajectoryLevel2Problem(config);
    },
  );

  it("keeps t before landing at the shortest flight", () => {
    // 10 m/s at 20 degrees lands at 0.697 s, so the latest t must be 0.6 s.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999);
    const config = createConfig();

    expect(config.problemStatementVariablesValues.time).toBe(0.6);
    expectValidCannonTrajectoryLevel2Problem(config);
  });

  it("randomized tests (1000): generates valid and correctly formatted problems", () => {
    for (let i = 0; i < 1000; i++) {
      expectValidCannonTrajectoryLevel2Problem(createConfig());
    }
  });

  it("generates the correct level configuration metadata", () => {
    const config = createConfig();

    expect(config).toMatchObject({
      gameId: "cannonTrajectory",
      levelId: 2,
      problemStatementVariables: [
        "launchSpeed",
        "launchAngle",
        "time",
        "gravitationalAcceleration",
      ],
      userInputVariables: [
        "averageHorizontalVelocity",
        "averageVerticalVelocity",
        "horizontalDisplacement",
        "verticalDisplacement",
      ],
      toleranceRule: { absolute: 0.05 },
    });
    expect(config.userInputVariablesUnits).toEqual({
      averageHorizontalVelocity: "m/s",
      averageVerticalVelocity: "m/s",
      horizontalDisplacement: "m",
      verticalDisplacement: "m",
    });
    expect(config.bounds).toEqual({
      averageHorizontalVelocity: { min: 0 },
      horizontalDisplacement: { min: 0 },
      verticalDisplacement: { min: 0 },
    });
  });

  it("accepts answers computed from rounded intermediate values, and rejects common mistakes", () => {
    // Longest flight and latest t, where rounding errors add up the most.
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    const config = createConfig();
    const validator = new DefaultAnswerValidator();
    const submit = (values: Record<string, number>) => ({
      gameId: config.gameId,
      levelId: config.levelId,
      values,
      units: config.userInputVariablesUnits,
    });
    const isCorrect = (values: Record<string, number>) =>
      validator.validateAnswer(submit(values), config).correct;
    const round2 = (value: number) => Number(value.toFixed(2));
    const { launchSpeed, launchAngle, time, gravitationalAcceleration } =
      config.problemStatementVariablesValues;
    const expected = config.expectedUserInput;

    // A student rounds each average velocity, then multiplies by t.
    const radians = (launchAngle * Math.PI) / 180;
    const averageHorizontalVelocity = round2(launchSpeed * Math.cos(radians));
    const averageVerticalVelocity = round2(
      launchSpeed * Math.sin(radians) - (gravitationalAcceleration * time) / 2,
    );
    const studentAnswer = {
      averageHorizontalVelocity,
      averageVerticalVelocity,
      horizontalDisplacement: round2(averageHorizontalVelocity * time),
      verticalDisplacement: round2(averageVerticalVelocity * time),
    };
    expect(isCorrect(expected)).toBe(true);
    expect(isCorrect(studentAnswer)).toBe(true);

    // Using the initial vertical velocity instead of the average is wrong.
    const initialVerticalVelocity = launchSpeed * Math.sin(radians);
    expect(
      isCorrect({
        ...expected,
        averageVerticalVelocity: initialVerticalVelocity,
        verticalDisplacement: initialVerticalVelocity * time,
      }),
    ).toBe(false);

    // Swapping sin and cos is wrong.
    expect(
      isCorrect({
        ...expected,
        averageHorizontalVelocity: initialVerticalVelocity,
      }),
    ).toBe(false);

    // A negative delta y is out of bounds while the stuntman is in the air.
    expect(
      validator.validateInput(
        submit({
          ...expected,
          verticalDisplacement: -expected.verticalDisplacement,
        }),
        config,
      ),
    ).toBe(false);
  });
});
