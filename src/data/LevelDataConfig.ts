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
  public createLevelDataConfig(gameId : GameId, levelId : number) {
    switch (gameId) {
      case "kinematics":
        switch (levelId) {
          case 1:
            break;
          case 2:
            break;
          case 3:
            break;
          case 4:
            break;
          default:
            throw new Error("levelId does not exist");
        }
        break;
      case "netForce":
        switch (levelId) {  
          case 1:
            break;
          case 2:
            break;
          default:
            throw new Error("levelId does not exist");
        }
        break;
      default:
        throw new Error("gameId does not exist"); 
    }
  }
};

/*class Level2 implements LevelDataConfig{
    gameName = "netForce"
    levelId = 2
    problemStatementVariables = [...]
    problemStatementVariablesValues // dictionary, map
    problemStatment = `Problem statement: ${relevantVariable}`
    userInputVariables = [...]
    userInputVariablesUnits = [...]
    expectedUserInput = {velocity: 12.5} // example, change
    toleranceRule = {absolute: 0.1} // example, change
    bounds = {velocity: { min: 0 }} // example, change

    generateProblemStatement(LevelDataConfig level){
        //wording generator
        // calls calculateGravity, calculateNormalForce, and calculateNetForceDirectlyOpposingForces in a factory
    }
}*/

//test bench via verification