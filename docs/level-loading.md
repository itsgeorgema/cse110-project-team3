# Validated level loading (#21)

Players can load a real physics problem from **Practice levels**, answer it,
correct invalid input, and switch to another registered level. Only configs
that pass the runtime format check reach the problem screen. A failed load
shows a message, **Try again**, and the level picker; it never leaves an old
answer form active.

## Use the feature

Run `npm run dev`, open the printed local URL, select **Practice levels**, choose
a problem, and press **Load level**. Enter an answer and press **Check answer**
or Enter. A load generates a new problem; editing or submitting keeps that
problem unchanged. Switching levels discards the previous inputs and feedback.
Escape or **Return to story map** clears the session.

Practice links accept `?game=kinematics&level=1` (also levels 2 and 3) or
`?game=netForce&level=2`. Unknown or malformed addresses show the same recoverable
failure screen. Links select an identity, not a reproducible random problem.

Practice is independent of the map's `circus-preview` fixtures. It does not grant
completion, save attempts/drafts, or run animated physics. These remain separate
integration work; the existing parser and answer validator provide real answer
checking here.

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

The composition root is `src/main.ts`. Future #22 routing can call
`LevelSession.selectLevel(address)` after checking graph adjacency and progression
and opening the level panel. The loader itself deliberately does not grant or
deny progression access; practice exposes all registered levels.

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
unknown level links. It runs against the production build under the Pages base
path; the core practice flow is tagged `@smoke` for existing PR CI. Malformed
factory results and generator exceptions are injected in unit/integration tests,
without adding production test hooks.

CI enforces 90% per-file logic coverage and changed-line coverage on committed
PR changes. View DOM composition is covered by browser tests rather than the
logic coverage percentage. Hosted checks still need to pass after pushing.
