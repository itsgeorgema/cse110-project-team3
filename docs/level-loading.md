# Validated level loading (#21)

Players open real physics problems directly from the story map. Available
registered levels expose **Start level** or **Replay level**; locked nodes cannot
launch, and locations without a registered factory report that they are coming soon.
Only configs that pass the runtime format check reach the problem screen.

## Use the feature

Run `npm run dev`, open the printed URL, and press **Start level** at the first
map location. Enter an answer and press **Check answer** or Enter. A load generates
a new problem; editing or submitting keeps it unchanged. Escape or **Return to
story map** clears the session and restores focus to the launching button.
Select an available neighboring map location to load its own problem and fields.

A loading failure displays a message and **Try again**. The return button is
always available. There is no separate practice picker or query-string launch
path that bypasses map availability.

The first three locations load kinematics levels 1–3; the fourth loads the
implemented net-force level 2. Later locations are unregistered placeholders.
New saves have no completions, and old preview achievements do not unlock real
levels. Answer checking works before animation exists. Recording completion
and unlocking subsequent levels after playback remain #80 integration work;
this change does not manufacture completion on load or on answer feedback.

## Architecture and decisions

1. `createLevelCatalog()` registers implemented TypeScript factories by game/level
   pair and provides titles. Listing the catalog does not generate problems.
2. `LevelManager.loadModule(address)` calls the selected factory, copies the
   result, validates its shape, and verifies that its identity matches the
   request. Duplicate registrations fail at construction. Unknown levels,
   generator exceptions, and invalid configs have distinct failure reasons
   with player-facing messages.
3. `assertLevelConfig` checks field maps, finite numbers, units, nonnegative
   tolerances (including overflow), and valid bounds containing expected answers.
   The check belongs in the data layer and does not verify physics calculations.
4. `LevelSession` clears the previous screen before loading. Success constructs
   `GameController` and renders the problem; failure renders recovery controls.
   A revision counter makes callbacks from replaced or closed screens inert.
5. `LevelPanel` implements the session's view port. It builds fields from
   `userInputVariables`, uses text nodes for config strings, and sends `RawInput`
   to the session callback. `GameController` and `DefaultAnswerValidator` retain
   responsibility for parsing and checking answers.

The composition root is `src/main.ts`. It receives launch callbacks from the map,
opens `LevelPanel`, and calls `LevelSession.selectLevel(address)`. The map checks
availability and registration before emitting the callback. #22 routing now
uses `OverworldNavigation` to restrict selection to neighboring locations. The loader remains independent of
map layout and progression policy.

To add a level, implement its factory, register it in `levelCatalog.ts`, and add
deterministic loader tests. The common view does not branch on game identity.

## Validation

Use the existing CI scripts:

```sh
npm run lint
npm run format:check
npm run typecheck
npm run test:contracts
npm run test:browser:types
npm run test:ci-policy
npm run test:coverage
npm run test:smoke
npm run test:e2e
```

`validateLevelConfig.test.ts` covers valid data and malformed fields, numeric
boundaries, bounds, and tolerance overflow. `LevelManager.test.ts` covers every
production registration, unknown identities, mismatches, factory failures,
retries, and copy isolation. `LevelSession.test.ts` exercises the real controller
and validator, ensures failures never render a problem, and checks stale callbacks.
Factories use fixed randomness in these tests.

`tests/e2e/level-loading.spec.ts` covers loading and correcting answers at desktop
and narrow widths, multi-field level switching, focus/closing, and recovery from
failed generation, locked destinations, and old preview saves. It runs against the production build under the Pages base
path; the core level-loading flow is tagged `@smoke` for existing PR CI. Malformed
factory results and generator exceptions are injected in unit/integration tests,
without adding production test hooks.

CI enforces 90% per-file logic coverage and changed-line coverage on committed
PR changes. View DOM composition is covered by browser tests rather than the
logic coverage percentage. Hosted checks still need to pass after pushing.
