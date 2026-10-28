# Session progress (#41), steps 1–2

`ProgressTracker` reuses `AnswerValidationResult` from the current validation
contract. Level identity is the pair `(gameId, levelId)`.

- `recordAttempt(result)` records one completed playback. The controller must call
  it exactly once after playback finishes, never at answer submission or on replay
  of the same animation. Playback lifecycle integration belongs to #26 and #23.
- Both correct and incorrect results are retained in insertion order.
- `isCompleted(gameId, levelId)` is true when history contains a correct attempt
  for that exact game and level. Failed replays never clear completion, and a new
  tracker starts with no completed levels. Completion is derived from history.
- `getAttempts()` returns an immutable snapshot of history. Submitted values and
  units are copied so later edits cannot rewrite history.

This is an implementation proposal for controller review, not a claim that the
interfaces have been agreed with its owner. Level ordering,
availability, and controller integration will follow in separate PRs.
Persistence, drafts, scoring, and skill checks are deferred.
