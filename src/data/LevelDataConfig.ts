import type { ToleranceRule, AnswerBounds } from "../model/AnswerValidator";

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

  private createKinematicsLevel1LevelDataConfig() : LevelDataConfig {
    return {
      gameName: "kinematics",
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

  private createKinematicsLevel2LevelDataConfig() : LevelDataConfig {
    // TODO Finish
    return {
      gameName: "kinematics",
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

  private createKinematicsLevel3LevelDataConfig() : LevelDataConfig {
     // TODO Finish
    return {
      gameName: "kinematics",
      levelId: 3,
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