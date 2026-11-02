# Session progress and next-level selection (#41)

`ProgressTracker` reuses `AnswerValidationResult` from the current validation
contract. The shared `LevelAddress` record carries the pair `(gameId, levelId)` throughout
tracking and progression.

- `recordAttempt(result)` records one completed playback. The controller must call
  it exactly once after playback finishes, never at answer submission or on replay
  of the same animation. Playback lifecycle integration belongs to #26 and #23.
- Both correct and incorrect results are retained in insertion order.
- `isCompleted(level: LevelAddress)` is true when history contains a correct attempt
  for that exact game and level. Failed replays never clear completion, and a new
  tracker starts with no completed levels. Completion is derived from history.
- `getAttempts()` returns an immutable snapshot of history. Submitted values and
  units are copied so later edits cannot rewrite history.

`ProgressionSystem` accepts and returns `LevelAddress` records, using a caller-supplied level order and the tracker’s
`isCompleted` query. It returns the next configured level only after completion,
returns `undefined` for missing/unknown identities or the final level, and rejects
duplicate game/level pairs. The order is copied to prevent caller mutation.

`isAvailable(level: LevelAddress)` makes the first configured level available
initially. An uncompleted level requires every earlier level to be completed;
already completed levels remain replayable even if an earlier level is incomplete.
Unknown or missing addresses are unavailable. Failed attempts do not remove
earned availability. These queries do not record attempts or mutate progress.

This is an implementation proposal for controller review, not a claim that the
interfaces have been agreed with its owner. Controller integration
will follow in a separate PR.
Persistence, drafts, scoring, and skill checks are deferred.
