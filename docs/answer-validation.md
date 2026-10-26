# Answer validation (#40)

Interface proposal only; implementation follows review.
Types: [AnswerValidator.ts](../src/model/AnswerValidator.ts).

| Owner | Provides |
| --- | --- |
| UI/controller (#25) | Parsed numerical answers and fixed unit labels |
| Physics/problem subteam | Current problem's expected answers, tolerance, and optional bounds |
| Validator (#40) | Submitted answer, `correct`, and `feedback` |

The controller displays feedback and records the attempt after playback (#26).

- `validateInput(input, level)`: checks level ID, required fields, finite values, and bounds.
- `validateAnswer(input, level)`: also checks correctness; the controller can call this directly.
- Every required answer must pass. Bounds and tolerance endpoints are inclusive.
- Allowed error: `max(absolute, relative * abs(expected))`; relative defaults to zero.
- Units are preserved without conversion. Invalid problem configuration is a developer error.

Example after a validator implementation exists:

```ts
const problem = {
  gameName = “carKinematics”，
  levelId = 1，
  problemStatementVariables = [...]，
  userInputVariables = [...]，
  problemStatementVariablesValues， // dictionary, map
  ProblemStatment = `Problem statement: ${relevantVariable}`，
  expectedSolution = {velocity: 12.5}，
  toleranceRule = {absolute: 0.1}，
  bounds = {velocity: { min: 0 }}
};
const input = {
  levelId: problem.levelId,
  values: { velocity: 12.55 },
  units: { velocity: "m/s" },
};
const result = validator.validateAnswer(input, problem); // Expected: correct === true
```