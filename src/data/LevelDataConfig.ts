import type { ToleranceRule, AnswerBounds } from "../model/AnswerValidator";
import { PhysicsEngine } from "../model/PhysicsEngine";

export interface LevelDataConfig {
  readonly gameId: string;
  readonly levelId: number;
  readonly problemStatementVariables: readonly string[];
  readonly problemStatementVariablesValues: Readonly<Record<string, number>>;
  readonly problemStatement: string; // Problem statement in form `${relevantVariable}`
  readonly userInputVariables: readonly string[];
  readonly userInputVariablesUnits: Readonly<Record<string, string>>;
  readonly expectedUserInput: Readonly<Record<string, number>>;
  readonly toleranceRule: ToleranceRule;
  readonly bounds: Readonly<Record<string, AnswerBounds>>;
}

type GameId = "kinematics" | "netForce" | "circularMotion";

export class LevelDataConfigFactory {
  // caller method, which instantiates the different levels
  public createLevelDataConfig(
    gameId: GameId,
    levelId: number,
  ): LevelDataConfig {
    switch (gameId) {
      case "kinematics":
        switch (levelId) {
          case 1:
            return this.createKinematicsLevel1LevelDataConfig();
          case 2:
            return this.createKinematicsLevel2LevelDataConfig();
          case 3:
            return this.createKinematicsLevel3LevelDataConfig();
          default:
            throw new Error("levelId does not exist");
        }
      case "netForce":
        switch (levelId) {
          case 2:
            return this.createNetForceLevel2LevelDataConfig();

          default:
            throw new Error("levelId does not exist");
        }
      case "circularMotion":
        switch (levelId) {
          case 1:
            return this.createCircularMotionLevel1LevelDataConfig();
          case 3:
            return this.createCircularMotionLevel3LevelDataConfig();
          default:
            throw new Error("levelId does not exist");
        }
      default:
        throw new Error("gameId does not exist");
    }
  }

  /**
   * Generates a random integer between min and max, inclusive.
   *
   * @param min - The minimum possible integer.
   * @param max - The maximum possible integer.
   * @returns A random integer in the range [min, max].
   */
  private randomIntegerInclusive(min: number, max: number): number {
    // Calculate the number of possible integers in the range.
    // Add 1 because both min and max should be included.
    const range = max - min + 1;

    // Math.random() returns a number >= 0 and < 1.
    // Multiplying by range scales it to a number >= 0 and < range.
    // Math.floor() rounds down to an integer from 0 to range - 1.
    // Note range - 1 = max - min.
    const randomOffset = Math.floor(Math.random() * range);

    // Shift the random integer by min so the result is between
    // min and max, inclusive.
    return randomOffset + min;
  }

  private createKinematicsLevel1LevelDataConfig(): LevelDataConfig {
    const velocityForProblem = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const displacementForProblem = PhysicsEngine.calculateDisplacement(
      velocityForProblem,
      timeForProblem,
    ); // meters

    const problemStatement =
      `Velocity is displacement (the change in ` +
      `position from start to finish) divided by the ` +
      `time taken. If a getaway car moves ` +
      `${displacementForProblem} meters straight ` +
      `toward the backstage gate in ${timeForProblem} ` +
      `seconds, what is the car's velocity?`;

    return {
      gameId: "kinematics",
      levelId: 1,
      problemStatementVariables: ["displacement", "time"],
      problemStatementVariablesValues: {
        time: timeForProblem,
        displacement: displacementForProblem,
      },
      problemStatement: problemStatement,
      userInputVariables: ["velocity"],
      userInputVariablesUnits: { velocity: "m/s" },
      expectedUserInput: { velocity: velocityForProblem },
      toleranceRule: { absolute: 0.00001 },
      bounds: {
        velocity: { min: 0.0 },
      },
    };
  }

  private createKinematicsLevel2LevelDataConfig(): LevelDataConfig {
    const velocityForProblem = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const displacementForProblem = PhysicsEngine.calculateDisplacement(
      velocityForProblem,
      timeForProblem,
    ); // meters

    const problemStatement =
      `Displacement is velocity (speed with direction) ` +
      `multiplied by the time taken. If a getaway car ` +
      `moves away from the guards in ${velocityForProblem} m/s for ` +
      `${timeForProblem} seconds, what is the car's displacement?`;

    return {
      gameId: "kinematics",
      levelId: 2,
      problemStatementVariables: ["velocity", "time"],
      problemStatementVariablesValues: {
        velocity: velocityForProblem,
        time: timeForProblem,
      },
      problemStatement: problemStatement,
      userInputVariables: ["displacement"],
      userInputVariablesUnits: { displacement: "m" },
      expectedUserInput: { displacement: displacementForProblem },
      toleranceRule: { absolute: 0.00001 },
      bounds: {
        displacement: { min: 0.0 },
      },
    };
  }

  private createKinematicsLevel3LevelDataConfig(): LevelDataConfig {
    const initialVelocity = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const finalVelocity =
      initialVelocity + this.randomIntegerInclusive(1, 5) * timeForProblem;
    const accelerationForProblem = PhysicsEngine.calculateAcceleration(
      initialVelocity,
      finalVelocity,
      timeForProblem,
    ); // meters/second squared

    const problemStatement =
      `Acceleration is the rate of change. That is, the ` +
      `change from initial velocity to the final velocity divided ` +
      `by time taken. If a getaway car accelerates up from ` +
      `${initialVelocity} m/s to ${finalVelocity} m/s in ` +
      `${timeForProblem} seconds to outrun the guard, what is the car's acceleration?`;

    return {
      gameId: "kinematics",
      levelId: 3,
      problemStatementVariables: ["initialVelocity", "finalVelocity", "time"],
      problemStatementVariablesValues: {
        initialVelocity: initialVelocity,
        finalVelocity: finalVelocity,
        time: timeForProblem,
      },
      problemStatement: problemStatement,
      userInputVariables: ["acceleration"],
      userInputVariablesUnits: { acceleration: "m/s^2" },
      expectedUserInput: { acceleration: accelerationForProblem },
      toleranceRule: { absolute: 0.00001 }, //final?
      bounds: {
        acceleration: { min: 0.0 }, //final?
      },
    };
  }

  private createNetForceLevel2LevelDataConfig(): LevelDataConfig {
    const gravitationalAcceleration = 9.81; // m/s^2
    const mass = this.randomIntegerInclusive(5, 30); // kg
    const gravitationalForce = PhysicsEngine.calculateForce(
      mass,
      gravitationalAcceleration,
    ); //graviational acceleration is m/s^2
    const normalForce = gravitationalForce;
    const netForce = PhysicsEngine.calculateNetForce(
      normalForce,
      gravitationalForce,
    ); // Newtons (N)

    const problemStatement =
      `Net force is the vector sum of all forces acting on an object. ` +
      `A crate with a mass of ${mass} kg rests on the ground. ` +
      `Given that the acceleration from gravity is ${gravitationalAcceleration} m/s^2, ` +
      `what are the gravitational force on the crate, the normal force from the ground, ` +
      `and the net force acting on the crate?`;

    return {
      gameId: "netForce",
      levelId: 2,
      problemStatementVariables: ["mass", "gravitationalAcceleration"],
      problemStatementVariablesValues: { mass, gravitationalAcceleration },
      problemStatement,
      userInputVariables: ["gravitationalForce", "normalForce", "netForce"],
      userInputVariablesUnits: {
        gravitationalForce: "N",
        normalForce: "N",
        netForce: "N",
      },
      expectedUserInput: { gravitationalForce, normalForce, netForce },
      toleranceRule: { absolute: 0.00001 },
      bounds: { gravitationalForce: { min: 0.0 }, normalForce: { min: 0.0 } },
    };
  }

  private createCircularMotionLevel1LevelDataConfig(): LevelDataConfig {
    const speed = this.randomIntegerInclusive(10, 40); // m/s
    const radius = this.randomIntegerInclusive(5, 40); // m
    const centripetalAcceleration =
      PhysicsEngine.calculateCentripetalAcceleration(speed, radius); // m/s^2

    const problemStatement =
      `When an object moves along a circle, its velocity keeps changing direction, ` +
      `so it is always accelerating toward the center of the circle. ` +
      `This is called centripetal acceleration, and it equals the speed squared ` +
      `divided by the radius of the circle (a = v^2 / r). ` +
      `A roller coaster travels at a speed of ${speed} m/s at the top of a loop ` +
      `with a radius of ${radius} m. ` +
      `What is the roller coaster's acceleration at the top of the loop? ` +
      `Round your answer to two decimal places.`;

    return {
      gameId: "circularMotion",
      levelId: 1,
      problemStatementVariables: ["speed", "radius"],
      problemStatementVariablesValues: { speed, radius },
      problemStatement,
      userInputVariables: ["acceleration"],
      userInputVariablesUnits: { acceleration: "m/s^2" },
      expectedUserInput: { acceleration: centripetalAcceleration },
      toleranceRule: { absolute: 0.01 },
      bounds: { acceleration: { min: 0 } },
    };
  }

  private createCircularMotionLevel3LevelDataConfig(): LevelDataConfig {
    const gravitationalAcceleration = 9.81; // m/s^2
    const mass = this.randomIntegerInclusive(200, 500); // kg
    const radius = this.randomIntegerInclusive(5, 15); // m
    const minimumSpeed = PhysicsEngine.calculateMinimumLoopSpeed(
      radius,
      gravitationalAcceleration,
    );

    const problemStatement =
      `At the top of the loop, gravity pulls the coaster toward the center. ` +
      `The track can only push the coaster toward the center, so its normal force must be zero or positive for the coaster to stay in contact. ` +
      `A coaster with a mass of ${mass} kg travels at a speed of v m/s at the top of a loop with a radius of ${radius} m. ` +
      `Use ${gravitationalAcceleration} m/s^2 for gravity and take the direction toward the center as positive. ` +
      `First, express the net force at the top in terms of v. ` +
      `At the minimum speed, the normal force is zero, so the net force equals the coaster's weight. ` +
      `Use this condition to find the minimum speed needed to stay in contact with the track. ` +
      `Round your answer to two decimal places.`;

    return {
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
      problemStatement,
      userInputVariables: ["minimumSpeed"],
      userInputVariablesUnits: { minimumSpeed: "m/s" },
      expectedUserInput: { minimumSpeed },
      toleranceRule: { absolute: 0.01 },
      bounds: { minimumSpeed: { min: 0 } },
    };
  }
}
