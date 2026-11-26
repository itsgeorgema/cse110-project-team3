import { afterEach, describe, it, expect, vi } from "vitest";
import { LevelDataConfigFactory } from "./LevelDataConfig";
import type { LevelDataConfig } from "./LevelDataConfig";
import { assertLevelConfig } from "./validateLevelConfig";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator";
import { GameController } from "../controller/GameController";
import { FakeAnimationEngine } from "../view/animation/FakeAnimationEngine";

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

  it.each([0, 2, 99])("rejects cannonTrajectory level %s", (levelId) => {
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

const netForceLevel1Factory = new LevelDataConfigFactory();
const netForceLevel1Validator = new DefaultAnswerValidator();

describe("createLevelDataConfig for net force game, level 1", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    [0, 5, 1, 5],
    [0.5, 18, 3, 54],
    [0.99999, 30, 5, 150],
  ])(
    "generates a physically specified crate problem at random=%s",
    (random, mass, acceleration, force) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const config = netForceLevel1Factory.createLevelDataConfig("netForce", 1);
      expect(() => assertLevelConfig(config)).not.toThrow();
      expect(config.problemStatementVariablesValues).toEqual({
        mass,
        acceleration,
      });
      expect(config.expectedUserInput).toEqual({ force });
      expect(config.userInputVariablesUnits).toEqual({ force: "N" });
      expect(config.problemStatement).toContain(`${mass} kg`);
      expect(config.problemStatement).toContain(`${acceleration} m/s^2`);
      expect(config.problemStatement).toContain("Ignore friction");
      expect(config.problemStatement).toContain("push is horizontal");
      expect(config.problemStatement).toContain("F = m*a");
    },
  );
});

{
  const gameId = "netForce";
  const levelId = 1;
  describe(`${gameId} ${levelId} answer integration`, () => {
    afterEach(() => vi.restoreAllMocks());

    it("accepts generated answers and rejects each independently incorrect or missing field", () => {
      for (let i = 0; i < 100; i++) {
        const config = netForceLevel1Factory.createLevelDataConfig(
          gameId,
          levelId,
        );
        expect(() => assertLevelConfig(config)).not.toThrow();
        const submit = (values: Record<string, number>) =>
          netForceLevel1Validator.validateAnswer(
            { gameId, levelId, values, units: config.userInputVariablesUnits },
            config,
          );
        expect(submit(config.expectedUserInput).correct).toBe(true);
        for (const field of config.userInputVariables) {
          expect(
            submit({
              ...config.expectedUserInput,
              [field]: config.expectedUserInput[field] + 1,
            }).correct,
          ).toBe(false);
          expect(
            submit({ ...config.expectedUserInput, [field]: -1 }).correct,
          ).toBe(false);
          const missing = { ...config.expectedUserInput };
          delete missing[field];
          expect(submit(missing).correct).toBe(false);
        }
      }
    });

    it("handles invalid input, a wrong answer, and correction through GameController", () => {
      const config = netForceLevel1Factory.createLevelDataConfig(
        gameId,
        levelId,
      );
      const errors = vi.fn();
      const feedback = vi.fn();
      const recordAttempt = vi.fn();
      const controller = new GameController(
        config,
        errors,
        netForceLevel1Validator,
        feedback,
        {
          animation: new FakeAnimationEngine(),
          buildRun: () => [],
          progress: { recordAttempt },
        },
      );
      const fields = Object.fromEntries(
        Object.entries(config.expectedUserInput).map(([key, value]) => [
          key,
          String(value),
        ]),
      );
      const field = config.userInputVariables[0];
      controller.submitAnswer({
        gameId,
        levelId,
        fields: { ...fields, [field]: "letters" },
      });
      expect(errors).toHaveBeenLastCalledWith({
        [field]: "Use digits, like 9.8 or 3e8.",
      });
      expect(recordAttempt).not.toHaveBeenCalled();
      controller.submitAnswer({
        gameId,
        levelId,
        fields: {
          ...fields,
          [field]: String(config.expectedUserInput[field] + 1),
        },
      });
      expect(feedback).toHaveBeenLastCalledWith(
        expect.objectContaining({ correct: false }),
      );
      controller.submitAnswer({ gameId, levelId, fields });
      expect(feedback).toHaveBeenLastCalledWith(
        expect.objectContaining({ correct: true }),
      );
      expect(recordAttempt).toHaveBeenCalledTimes(2);
      controller.dispose();
    });
  });
}

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

describe("createLevelDataConfig for circular motion game, level 2", () => {
  const gravitationalAcceleration = 9.81;

  // Mocks Math.random() so the factory draws speed, mass, then radius.
  // See LevelDataConfigFactory.randomIntegerInclusive().
  const createWithRandomValues = (...randomValues: number[]) => {
    const spy = vi.spyOn(Math, "random");
    randomValues.forEach((value) => spy.mockReturnValueOnce(value));
    return new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      2,
    );
  };

  const submit = (config: LevelDataConfig, values: Record<string, number>) =>
    new DefaultAnswerValidator().validateAnswer(
      {
        gameId: config.gameId,
        levelId: config.levelId,
        values,
        units: config.userInputVariablesUnits,
      },
      config,
    );

  const expectValidCircularMotionLevel2Problem = (config: LevelDataConfig) => {
    const { problemStatement, problemStatementVariablesValues } = config;

    const massMatch = problemStatement.match(/mass of (\d+) kg/);
    const speedMatch = problemStatement.match(/speed of (\d+) m\/s/);
    const radiusMatch = problemStatement.match(/radius of (\d+) m\./);
    expect(massMatch).not.toBeNull();
    expect(speedMatch).not.toBeNull();
    expect(radiusMatch).not.toBeNull();

    const mass = Number(massMatch?.[1]);
    const speed = Number(speedMatch?.[1]);
    const radius = Number(radiusMatch?.[1]);

    // Validate generated ranges.
    expect(speed).toBeGreaterThanOrEqual(13);
    expect(speed).toBeLessThanOrEqual(25);
    expect(mass).toBeGreaterThanOrEqual(200);
    expect(mass).toBeLessThanOrEqual(500);
    expect(radius).toBeGreaterThanOrEqual(5);
    expect(radius).toBeLessThanOrEqual(15);

    // The statement and stored values describe the same problem.
    expect(problemStatementVariablesValues).toEqual({
      speed,
      mass,
      radius,
      gravitationalAcceleration,
    });

    // Validate the physics independently of PhysicsEngine.
    const acceleration = (speed * speed) / radius;
    const netForce = mass * acceleration;
    const gravitationalForce = mass * gravitationalAcceleration;
    const normalForce = netForce - gravitationalForce;
    expect(Object.keys(config.expectedUserInput)).toEqual(
      config.userInputVariables,
    );
    expect(config.expectedUserInput.acceleration).toBeCloseTo(acceleration, 6);
    expect(config.expectedUserInput.netForce).toBeCloseTo(netForce, 6);
    expect(config.expectedUserInput.gravitationalForce).toBeCloseTo(
      gravitationalForce,
      6,
    );
    expect(config.expectedUserInput.normalForce).toBeCloseTo(normalForce, 6);
    // The coaster must stay on the track.
    expect(normalForce).toBeGreaterThan(0);

    // Validate problem statement formatting.
    expect(problemStatement).not.toMatch(/\s{2,}/);
    expect(problemStatement).not.toMatch(/^\s|\s$/);
    expect(problemStatement).not.toMatch(/\s+[,.;:!?)}\]]/);
    expect(problemStatement).toMatch(
      /^At the top of a loop, .* A roller coaster with a mass of \d+ kg travels at a speed of \d+ m\/s at the top of a loop with a radius of \d+ m\. Use 9\.81 m\/s\^2 for gravity and take the direction toward the center as positive\. Calculate the acceleration, net force, normal force, and gravitational force acting on the roller coaster at the top of the loop\. Keep full precision in intermediate steps and round only your final answers to two decimal places\.$/,
    );

    // The statement defines every symbol it uses.
    expect(problemStatement).toContain(
      "a = v^2 / r, where a is the acceleration (m/s^2), v is the coaster's speed (m/s), and r is the radius of the loop (m)",
    );
    expect(problemStatement).toContain(
      "F_net, F_g, and F_N are labels for forces, measured in newtons (N)",
    );
    expect(problemStatement).toContain("m is the coaster's mass (kg)");
    expect(problemStatement).toContain(
      "g is the acceleration due to gravity (m/s^2)",
    );
    expect(problemStatement).toContain("F_net = F_N + F_g");

    expect(() => assertLevelConfig(config)).not.toThrow();
  };

  it("deterministic test: generates the expected loop-top forces problem", () => {
    try {
      // speed = floor(0.5 * 13) + 13 = 19, mass = floor(0.5 * 301) + 200 = 350,
      // radius = floor(0.5 * 11) + 5 = 10
      const config = createWithRandomValues(0.5, 0.5, 0.5);

      expect(config.problemStatementVariablesValues).toEqual({
        speed: 19,
        mass: 350,
        radius: 10,
        gravitationalAcceleration,
      });
      expect(config.expectedUserInput.acceleration).toBeCloseTo(36.1, 6);
      expect(config.expectedUserInput.netForce).toBeCloseTo(12635, 6);
      expect(config.expectedUserInput.gravitationalForce).toBeCloseTo(
        3433.5,
        6,
      );
      expect(config.expectedUserInput.normalForce).toBeCloseTo(9201.5, 6);
      expectValidCircularMotionLevel2Problem(config);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it.each([
    { name: "smallest values", random: [0, 0, 0], normalForce: 4798 },
    {
      name: "slowest speed on the largest loop",
      random: [0, 0.9999, 0.9999],
      normalForce: 728.333333,
    },
    {
      name: "largest values",
      random: [0.9999, 0.9999, 0.9999],
      normalForce: 15928.333333,
    },
  ])(
    "generates a valid problem at the range edge: $name",
    ({ random, normalForce }) => {
      try {
        const config = createWithRandomValues(...random);

        expect(config.expectedUserInput.normalForce).toBeCloseTo(
          normalForce,
          5,
        );
        expectValidCircularMotionLevel2Problem(config);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );

  it("randomized tests (1000): should generate valid and correctly formatted loop-top forces problems", () => {
    const factory = new LevelDataConfigFactory();
    for (let i = 0; i < 1000; i++) {
      expectValidCircularMotionLevel2Problem(
        factory.createLevelDataConfig("circularMotion", 2),
      );
    }
  });

  it("should generate the correct level configuration metadata", () => {
    const config = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      2,
    );

    expect(config).toMatchObject({
      gameId: "circularMotion",
      levelId: 2,
      problemStatementVariables: [
        "speed",
        "mass",
        "radius",
        "gravitationalAcceleration",
      ],
      userInputVariables: [
        "acceleration",
        "netForce",
        "normalForce",
        "gravitationalForce",
      ],
      userInputVariablesUnits: {
        acceleration: "m/s^2",
        netForce: "N",
        normalForce: "N",
        gravitationalForce: "N",
      },
      toleranceRule: { absolute: 0.01 },
      bounds: {
        acceleration: { min: 0 },
        netForce: { min: 0 },
        normalForce: { min: 0 },
        gravitationalForce: { min: 0 },
      },
    });
  });

  it("accepts exact answers rounded to two decimals and rejects a wrong sign convention", () => {
    const config = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      2,
    );
    const { netForce, gravitationalForce } = config.expectedUserInput;
    const rounded = Object.fromEntries(
      Object.entries(config.expectedUserInput).map(([field, value]) => [
        field,
        Number(value.toFixed(2)),
      ]),
    );

    expect(submit(config, { ...config.expectedUserInput }).correct).toBe(true);
    expect(submit(config, rounded).correct).toBe(true);

    // Treating gravity as opposing the normal force (F_N = F_net + F_g)
    // is a common mistake and must be rejected.
    expect(
      submit(config, {
        ...rounded,
        normalForce: netForce + gravitationalForce,
      }).correct,
    ).toBe(false);
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

const kinematicsLevel4Factory = new LevelDataConfigFactory();
const kinematicsLevel4Validator = new DefaultAnswerValidator();

describe("createLevelDataConfig for kinematics game, level 4", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    [0, 5, 1, 2, 6, 12],
    [0.5, 18, 3, 5, 25.5, 127.5],
    [0.99999, 30, 5, 7, 47.5, 332.5],
  ])(
    "generates consistent problems at random=%s",
    (
      random,
      initialVelocity,
      acceleration,
      time,
      averageVelocity,
      distance,
    ) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const config = kinematicsLevel4Factory.createLevelDataConfig(
        "kinematics",
        4,
      );
      expect(() => assertLevelConfig(config)).not.toThrow();
      expect(config.problemStatementVariablesValues).toEqual({
        initialVelocity,
        acceleration,
        time,
      });
      expect(config.expectedUserInput).toEqual({ averageVelocity, distance });
      expect(config.userInputVariablesUnits).toEqual({
        averageVelocity: "m/s",
        distance: "m",
      });
      expect(config.problemStatement).toContain(`${initialVelocity} m/s`);
      expect(config.problemStatement).toContain(`${acceleration} m/s^2`);
      expect(config.problemStatement).toContain(`${time} seconds`);
      expect(config.problemStatement).toContain("v_avg = v_0 + a*t/2");
      expect(config.problemStatement).toContain("d = v_avg*t");
    },
  );
});

{
  const gameId = "kinematics";
  const levelId = 4;
  describe(`${gameId} ${levelId} answer integration`, () => {
    afterEach(() => vi.restoreAllMocks());

    it("accepts generated answers and rejects each independently incorrect or missing field", () => {
      for (let i = 0; i < 100; i++) {
        const config = kinematicsLevel4Factory.createLevelDataConfig(
          gameId,
          levelId,
        );
        expect(() => assertLevelConfig(config)).not.toThrow();
        const submit = (values: Record<string, number>) =>
          kinematicsLevel4Validator.validateAnswer(
            { gameId, levelId, values, units: config.userInputVariablesUnits },
            config,
          );
        expect(submit(config.expectedUserInput).correct).toBe(true);
        for (const field of config.userInputVariables) {
          expect(
            submit({
              ...config.expectedUserInput,
              [field]: config.expectedUserInput[field] + 1,
            }).correct,
          ).toBe(false);
          expect(
            submit({ ...config.expectedUserInput, [field]: -1 }).correct,
          ).toBe(false);
          const missing = { ...config.expectedUserInput };
          delete missing[field];
          expect(submit(missing).correct).toBe(false);
        }
      }
    });

    it("handles invalid input, a wrong answer, and correction through GameController", () => {
      const config = kinematicsLevel4Factory.createLevelDataConfig(
        gameId,
        levelId,
      );
      const errors = vi.fn();
      const feedback = vi.fn();
      const recordAttempt = vi.fn();
      const controller = new GameController(
        config,
        errors,
        kinematicsLevel4Validator,
        feedback,
        {
          animation: new FakeAnimationEngine(),
          buildRun: () => [],
          progress: { recordAttempt },
        },
      );
      const fields = Object.fromEntries(
        Object.entries(config.expectedUserInput).map(([key, value]) => [
          key,
          String(value),
        ]),
      );
      const field = config.userInputVariables[0];
      controller.submitAnswer({
        gameId,
        levelId,
        fields: { ...fields, [field]: "letters" },
      });
      expect(errors).toHaveBeenLastCalledWith({
        [field]: "Use digits, like 9.8 or 3e8.",
      });
      expect(recordAttempt).not.toHaveBeenCalled();
      controller.submitAnswer({
        gameId,
        levelId,
        fields: {
          ...fields,
          [field]: String(config.expectedUserInput[field] + 1),
        },
      });
      expect(feedback).toHaveBeenLastCalledWith(
        expect.objectContaining({ correct: false }),
      );
      controller.submitAnswer({ gameId, levelId, fields });
      expect(feedback).toHaveBeenLastCalledWith(
        expect.objectContaining({ correct: true }),
      );
      expect(recordAttempt).toHaveBeenCalledTimes(2);
      controller.dispose();
    });
  });
}

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
