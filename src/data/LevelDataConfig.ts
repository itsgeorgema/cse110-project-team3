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
          // case 2:
          //   return this.createNetForceLevel2LevelDataConfig();
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
                              `moves away from the guards in ${velocityForProblem} m/s for ` +
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
    const initialVelocity = this.randomIntegerInclusive(5, 30); // meters/second
    const timeForProblem = this.randomIntegerInclusive(2, 7); // seconds
    const finalVelocity = initialVelocity + this.randomIntegerInclusive(1,5) * timeForProblem;
    const accelerationForProblem = PhysicsEngine.calculateAcceleration(initialVelocity, finalVelocity, timeForProblem); // meters/second squared

    const problemStatement = `Acceleration is the rate of change. That is, the ` +
                              `change from initial velocity to the final velocity divided ` +
                              `by time taken. If a getaway car accelerates up from ` +
                              `${initialVelocity} m/s to ${finalVelocity} m/s in ` +
                              `${timeForProblem} seconds to outrun the guard, what is the car's acceleration?`;

    return {
      gameName: "kinematics",
      levelId: 3,
      problemStatementVariables: [ "initalVelocity", "finalVelocity", "time"],
      problemStatementVariablesValues: {
        initialVelocity: initialVelocity,
        finalVelocity: finalVelocity,
        time: timeForProblem
      },
      problemStatement: problemStatement,
      userInputVariables: ["acceleration"],
      userInputVariablesUnits: {acceleration: "m/s^2"},
      expectedUserInput: {acceleration: accelerationForProblem},
      toleranceRule: { absolute: 0.00001 }, //final?
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

  //private createNetForceLevel2LevelDataConfig() : LevelDataConfig {
    // TODO Finish
    // const mass = this.randomIntegerInclusive(5, 30); // meters/second
    // const gravitationalForce = PhysicsEngine.calculateGravity(mass)
    // const normalForce = PhysicsEngine.calculateNormalForce(mass);
    // const netForceForProblem = PhysicsEngine.calculateNetForceDirectlyOpposingForces(normalForce, gravitationalForce); // meters/second squared

    // const problemStatement = `Net force is the sum all of the forces acted upon the object. If a crate ` +
    //                           `with ${mass} is resting on the ground, the gravitational force acts on the object ` +
    //                           `with ${gravitationalForce.toFixed(3)} N and the ground acts on an object with a normal force of ${normalForce.toFixed(3)} `+
    //                           `N. What is the net force acting on the object?`;
    //return {
      // gameName: "netForce",
      // levelId: 2,
      // problemStatementVariables: ["mass", "gravitationalForce", "normalForce"],
      // problemStatementVariablesValues: {
      //   mass: mass,
      //   gravitationalForce: gravitationalForce,
      //   normalForce: normalForce
      // },
      // problemStatement: problemStatement,
      // userInputVariables: ["netForceForProblem"],
      // userInputVariablesUnits: {"netForceForProblem": "N"},
      // expectedUserInput: {netForceForProblem: netForceForProblem},
      // toleranceRule: { absolute: 0.00001 },
      // bounds: {}
    //};
  //}
};