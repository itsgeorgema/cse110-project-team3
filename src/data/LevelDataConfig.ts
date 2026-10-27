//import interface from AnswerValidator

class LevelDataConfig{
    levelId: LevelId;
    gameName: string
    allowedVariables: VariableSpec[];
    environment: ContextTestEnvironment;
    initialConditions: InitialConditions;
    sceneObjects: {type: string; position: vec2} [];
    expectedSolution: solution;
    eoleranceRule: ToleranceRule;
    targetCoordinates: Vec2[];
}

class LevelDataConfigFactory{
    //caller method, which instantiates the different levels
}

interface LevelDataConfigInterface{
    levelId;
    gameName;
    allowedVariables;
    environment;
    initialConditions;
    sceneObjects;
    expectedSolution;
    eoleranceRule;
    targetCoordinates;
}


class Level2 implements LevelDataConfigInterface{
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