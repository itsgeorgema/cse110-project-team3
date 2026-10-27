import type { LevelDataConfig as ValidatorLevelConfig } from "../model/AnswerValidator";

interface LevelDataConfig{
//     gameName: string;
//     levelId: LevelId;
//     problemStatementVariables: string[];
//     problemStatementVariablesValues: Record<string, number>;
//     problemStatement: string; // template with {placeholders}, see note below
//     userInputVariables: string[];
//     userInputVariablesUnits: Record<string, string>;
//     expectedUserInput: Record<string, number>;
//     toleranceRule: ToleranceRule;
//     bounds: Record<string, Bounds>;
// }

class LevelDataConfigFactory{
    //caller method, which instantiates the different levels
    create(gameId, levelId);
}

class Level2 implements LevelDataConfig{
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
}

//test bench via verification