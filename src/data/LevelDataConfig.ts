import type { ToleranceRule, AnswerBounds } from "../model/AnswerValidator";
import { PhysicsEngine } from "../model/PhysicsEngine";

export interface LevelDataConfig {
  readonly gameName: string;
  readonly levelId: number;
  readonly problemStatementVariables: readonly string[];
  readonly problemStatementVariablesValues: Readonly<Record<string, number>>,
  readonly problemStatement: string; // Problem statement in form `${relevantVariable}`
  readonly userInputVariables: readonly string[];
  readonly userInputVariablesUnits: Readonly<Record<string, string>>;
  readonly expectedUserInput: Readonly<Record<string, number>>;
  readonly toleranceRule: ToleranceRule;
  readonly bounds: Readonly<Record<string, AnswerBounds>>;
}

type GameId = "kinematics" | "netForce";

export class LevelDataConfigFactory {
  // caller method, which instantiates the different levels
  public createLevelDataConfig(gameId : GameId, levelId : number) : LevelDataConfig {
    switch (gameId) {
      case "kinematics":
        switch (levelId) {
          case 1:
            return this.createKinematicsLevel1LevelDataConfig();
          case 2:
            return this.createKinematicsLevel2LevelDataConfig();
          case 3:
            return this.createKinematicsLevel3LevelDataConfig();
          case 4:
            return this.createKinematicsLevel4LevelDataConfig();
          default:
            throw new Error("levelId does not exist");
        }
        break;
      case "netForce":
        switch (levelId) {  
          case 1:
            return this.createNetForceLevel1LevelDataConfig();
          case 2:
            return this.createNetForceLevel2LevelDataConfig();
          default:
            throw new Error("levelId does not exist");
        }
        break;
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

  private createKinematicsLevel1LevelDataConfig() : LevelDataConfig {
    const velocityForProblem = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const displacementForProblem = PhysicsEngine.calculateDisplacement(velocityForProblem, timeForProblem); // meters

    const problemStatement = `Velocity is displacement (the change in ` +
                              `position from start to finish) divided by the ` +
                              `time taken. If a getaway car moves ` +
                              `${displacementForProblem} meters straight ` +
                              `toward the backstage gate in ${timeForProblem} ` +
                              `seconds, what is the car's velocity?`;

    return {
      gameName: "kinematics",
      levelId: 1,
      problemStatementVariables: ["displacement", "time"],
      problemStatementVariablesValues: {
        time: timeForProblem,
        displacement: displacementForProblem
      },
      problemStatement: problemStatement,
      userInputVariables: ["velocity"],
      userInputVariablesUnits: { velocity: "m/s" },
      expectedUserInput: { velocity: velocityForProblem },
      toleranceRule: { absolute: 0.00001 },
      bounds: {
        velocity: { min: 0.0 }
      }
    };
  }

  private createKinematicsLevel2LevelDataConfig() : LevelDataConfig {
    const velocityForProblem = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const displacementForProblem = PhysicsEngine.calculateDisplacement(velocityForProblem, timeForProblem); // meters

    const problemStatement = `Displacement is velocity (speed with direction) ` +
                              `multiplied by the time taken. If a getaway car ` +
                              `moves in ${velocityForProblem} m/s in a ` +
                              `${timeForProblem} seconds, what is the car's displacement?`;
                             

    return {
      gameName: "kinematics",
      levelId: 2,
      problemStatementVariables: ["velocity", "time"],
      problemStatementVariablesValues: {
        velocity: velocityForProblem,
        time: timeForProblem
      },
      problemStatement: problemStatement,
      userInputVariables: ["displacement"],
      userInputVariablesUnits: {displacement:"m"},
      expectedUserInput: {displacement: displacementForProblem},
      toleranceRule: { absolute: 0.00001 }, //final?
      bounds: {
        velocity: { min: 0.0 } //final?
      }
    };
  }

  private createKinematicsLevel3LevelDataConfig() : LevelDataConfig {
     // TODO Finish
    const velocityForProblem = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const accelerationForProblem = PhysicsEngine.calculateAcceleration(velocityForProblem, velocityForProblem, timeForProblem, timeForProblem); // meters/second squared

    const problemStatement = `Acceleration is the vector rate of change. That is, the` +
                              `change from initial velocity to the final velocity divided ` +
                              `by the change from initial time to the final time. If a getaway car moves ` +
                              `at ${velocityForProblem} m/s initially to this ${velocityForProblem} m/s at the end ` +
                              `from ${timeForProblem} s to ${timeForProblem} s, what is the car's acceleraction?`;

    return {
      gameName: "kinematics",
      levelId: 3,
      problemStatementVariables: [ "velocity", "time"],
      problemStatementVariablesValues: {
        velocity: velocityForProblem,
        time: timeForProblem
      },
      problemStatement: problemStatement,
      userInputVariables: ["acceleration"],
      userInputVariablesUnits: {acceleration: "m/s^2"},
      expectedUserInput: {acceleration: accelerationForProblem},
      toleranceRule: { absolute: 0.0 }, //final?
      bounds: {
        acceleration: {min: 0.0} //final?
      }
    };
  }

  private createKinematicsLevel4LevelDataConfig() : LevelDataConfig {
    // TODO Finish
    return {
      gameName: "kinematics",
      levelId: 4,
      problemStatementVariables: [],
      problemStatementVariablesValues: {},
      problemStatement: "",
      userInputVariables: [],
      userInputVariablesUnits: {},
      expectedUserInput: {},
      toleranceRule: { absolute: 0.0 },
      bounds: {}
    };
  }

  private createNetForceLevel1LevelDataConfig() : LevelDataConfig {
    // TODO Finish
    return {
      gameName: "netForce",
      levelId: 1,
      problemStatementVariables: [],
      problemStatementVariablesValues: {},
      problemStatement: "",
      userInputVariables: [],
      userInputVariablesUnits: {},
      expectedUserInput: {},
      toleranceRule: { absolute: 0.0 },
      bounds: {}
    };
  }

  private createNetForceLevel2LevelDataConfig() : LevelDataConfig {
    // TODO Finish
    return {
      gameName: "netForce",
      levelId: 2,
      problemStatementVariables: [],
      problemStatementVariablesValues: {},
      problemStatement: "",
      userInputVariables: [],
      userInputVariablesUnits: {},
      expectedUserInput: {},
      toleranceRule: { absolute: 0.0 },
      bounds: {}
    };
  }
};