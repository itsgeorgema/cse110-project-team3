# Contributor rules

These rules apply to every change in this repository.

## Architecture

The project uses four layers: **view**, **controller**, **model**, and **model data**. Keep dependencies flowing through the controller; the view and model data must not call one another directly. The static and dynamic architecture diagrams are the reference for ownership and runtime message flow.

### View (`src/view/`)

- Own player interaction, display, feedback, and playback. `GameInterface` is the scene/UI facade; `MainMenuUI` handles level selection, and `LevelUI` handles answer input, attempt feedback, and next-level state.
- The view sends user commands to `GameController` and renders the feedback or state it receives. Do not put level lifecycle, answer correctness, progression, persistence, or physics rules in view classes.
- The view may consume model records such as `SimulationState`, `AnswerSubmission`, and `AttemptResult`. It must reach model services through the controller rather than calling them directly.
- Keep Konva imports and rendering code inside `src/view/`.
- `AnimationEngine` renders simulation states/frames and reports playback completion to the controller. It must not decide answer correctness or progression.

### Controller (`src/controller/`)

- `GameController` owns the active level and attempt lifecycle and coordinates the view with model services. Route level selection, answer submission, playback completion, next-level actions, and draft saves through it.
- `LevelManager` provides level configuration and catalog/skill-check access. `ProgressionSystem` determines clearance and unlocks based on completed attempt results.
- Keep orchestration here: evaluate submitted answers, request simulation for an attempt, wait for playback completion before recording its result, and return feedback/next-state information to the view. A correct result can enable the next level; an incorrect result allows retrying the current level.

### Model (`src/model/`)

- Keep gameplay calculations and state records independent of rendering and browser UI.
- `PhysicsEngine` simulates a learner's submitted answer using level conditions and produces `SimulationState` data for playback. Keep kinematics, force, collision, and other physics calculations in the model.
- `AnswerValidator` checks input validity and correctness against the level solution/rules and returns an `AttemptResult` with the submitted answer, correctness, feedback, and optional simulated outcome. Keep parsing/input-shape checks distinct from correctness checks.
- `ProgressTracker` owns completed-level state, attempt history, and drafts; it updates progress from completed results.
- Keep shared interfaces and record types before their implementing classes. Records such as `SimulationState`, `AnswerSubmission`, and `AttemptResult` carry data; they should not own rendering or orchestration behavior.

### Model data and persistence (`src/data/`)

- Represent each level as configuration data (for example `LevelDataConfig`): identity, allowed variables, environment, initial conditions, scene objects, expected solution, tolerance rules, and target coordinates. Do not encode individual level behavior in UI or controller conditionals.
- Keep saved progress as versioned data, including current level, completed levels, drafts, and attempt history. `SaveManager` owns serialization, schema validation, and storage/import/export; `ProgressTracker` owns the in-memory progress state and uses persistence through the controller boundary.
- Treat loaded or imported saved data as untrusted input and validate its schema before using it.

### Runtime flow and boundaries

1. The player interacts with the view; the view sends a command to the controller.
2. The controller loads level data and asks the validator to evaluate an answer. The validator returns correctness and an explanation.
3. For simulation, the controller supplies the learner answer and level configuration to the physics engine. The resulting state/frames go to the animation module for rendering.
4. Playback completion returns to the controller. It records the completed attempt, updates progression, and sends feedback and the next state to the view.
5. Drafts may be saved at any time; completed attempts are recorded after playback. Progress persistence is a separate data flow and must not depend on animation completing.

Arrows in the dynamic diagram describe directed messages/data flow, not a guaranteed execution order unless the flow is explicitly described above. Dashed save paths are independent of playback.

When a change uses or introduces a design pattern, name that pattern in the pull request description and explain its role briefly.

## TypeScript and tests

- Declare interfaces before their implementing classes.
- Every behavior or logic change must include or update relevant automated tests in the same change. Do not treat manual inspection or a successful build as a substitute for tests.
- Before opening a pull request, run `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm test` and resolve failures. For changes to model, controller, or data logic, also run `npm run test:coverage` and `npm run test:coverage:changed -- <base-commit-sha>`; satisfy the changed-line and whole-file coverage requirements documented in `README.md`.
- Update tests when fixing a bug, including a regression case that would have caught it. Keep tests focused on externally observable behavior and relevant layer boundaries.
- Pull requests must pass all required CI checks before merge. Do not bypass, dismiss, or weaken a failing required check to get a change merged. If a check fails, fix the cause and push an update; if it is infrastructure-related, rerun it and document the evidence in the pull request.
- Follow the testing plan and current coverage requirements in `README.md`; it is the source of truth for additional contract, browser, and CI policy checks.
- Link every change to its GitHub issue in the pull request.

## Pull requests

- Only the GitHub accounts listed in `.github/CONTRIBUTORS` may open pull requests. The PR gate closes pull requests from other accounts with an explanatory comment.
