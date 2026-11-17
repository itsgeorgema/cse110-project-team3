# `src/controller/`

The controller layer defines the boundary between player actions and application
logic. It loads validated levels, handles answer submissions, and
provides progression queries separately from the story map.
The current implementation contains input parsing, the game controller's
answer loop and a progression service. It does not yet contain a level
lifecycle or a composition root that builds a game controller.

## Implemented files

- [`LevelSession.ts`](./LevelSession.ts) loads through `LevelManager` and mounts
  a `LevelScreen` only on success. It constructs the existing `GameController`
  with `DefaultAnswerValidator` for answers. Navigation and closing
  clear the screen and invalidate old submit/retry callbacks. Loading errors
  expose retry without passing malformed configs to the view.
- [`LevelManager.ts`](./LevelManager.ts) resolves a `LevelAddress` against an
  injected catalog. `loadModule(address)` generates a fresh config, copies it,
  validates its format and identity, and returns `{ ok: true, config }` only on
  success. Failures return `{ ok: false, reason, message }`; callers must check
  `ok` before constructing a level view. Messages are suitable for players and
  do not expose factory exceptions. A failed load does not prevent retrying.
  `listLevels()` returns presentation metadata without generating problems.
  Availability/progression checks and view disposal belong to the caller.
- [`GameCommands.ts`](./GameCommands.ts) defines the actions the view can request:
  submit an answer, save a draft, or select a level. `RawInput` carries typed
  strings and a `LevelAddress` identity. This is an interface, not an
  implementation of those actions.
- [`parseInput.ts`](./parseInput.ts) converts the configured fields from text to
  finite numbers. It reports field-specific errors for missing, malformed, or
  non-finite values. It does not check bounds or whether an answer is correct;
  those belong to the validator.
- [`GameController.ts`](./GameController.ts) runs one answer through the loop
  in #80: parse the input, add the level's units, validate, show feedback, build
  the run with the level's `RunBuilder` and play it through an `AnimationEngine`
  (#23). When that playback finishes, it records the attempt once through an
  `AttemptRecorder` such as `ProgressController`. Wrong answers are played and
  recorded too. A replay, a stopped playback or a playback interrupted by a newer
  answer records nothing extra. `dispose()` stops playback and unsubscribes.
  No level supplies a real `RunBuilder` yet; that waits on the scene format and
  units (#89).
- [`ProgressionSystem.ts`](./ProgressionSystem.ts) receives an ordered list of
  level addresses and a completion query. It reports availability and the next
  level after success. It does not load level data, save progress, or control
  playback.

`main.ts` is the composition root. It wires browser storage to the overworld
map and constructs the level catalog, manager, session, and panel.

## Intended boundary

The level view sends `RawInput` through a session-owned submit callback. The
session coordinates loading and delegates parsing and validation to the existing
controller. Playback, draft saving, and recording completion are not part
of this integration. `GameCommands` remains the intended broader game interface.

Tests live beside the implementation as `*.test.ts`. See the
[testing plan](../../docs/testing/README.md) for current coverage and feature
acceptance expectations.

To construct the loader, pass `createLevelCatalog()` from
`src/data/levelCatalog.ts` to `new LevelManager(...)`, then call
`loadModule({ gameId: "kinematics", levelId: 1 })`. The browser entry point is
the map’s **Start level** / **Replay level** buttons. `npm run test:coverage` exercises real catalog loading,
invalid configs, mismatched identities, generation failures, retries, and data
isolation using deterministic fixtures and injected factories.

See [level loading](../../docs/level-loading.md) for the player flow, dependency
boundaries, test commands, and future overworld integration.
