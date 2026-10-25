# view/

What the player sees and touches. From the static view: GameInterface (facade), MainMenuUI,
LevelUI, AnimationEngine and each game's animation class, KonvaStage.

The view may read model records (SimulationState, AnswerSubmission) but reaches model
services (PhysicsEngine, ProgressTracker, AnswerValidator) only through the controller.
