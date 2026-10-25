# view/

What the player sees and touches. From the static view: GameInterface (facade), MainMenuUI,
LevelUI, KonvaStage, AnimationEngine and each game's animation class.

The view may read model records (SimulationState, AnswerSubmission) but reaches model
services (PhysicsEngine, ProgressTracker, AnswerValidator) only through the controller.

> [!IMPORTANT]
> Konva is only imported in TypeScript files under `src/view/`; Controllers or Models shouldn't worry about pixels.
