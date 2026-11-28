# `src/view/`

This layer renders the current browser experience and handles direct user
interaction. Konva imports are restricted to this directory by ESLint. The
current app has a story map that launches registered levels in a shared dialog.

## Implemented files

- [`LevelPanel.ts`](./LevelPanel.ts) implements the controller's `LevelScreen`
  port using a native dialog. It displays validated problem text and generated
  fields, submits raw input, displays field errors/answer feedback, and offers
  retry on load failure. Dynamic content uses DOM text, not HTML interpolation.
  Escape and the return button clear the session and restore launcher focus.
- [`overworld/OverworldMap.ts`](./overworld/OverworldMap.ts) renders the story
  map with native HTML controls and inline SVG scenery. Marker selection changes
  the current location only when `OverworldNavigation` accepts the destination.
  The controller supplies progression status and validated graph connections.
  The sidebar offers Reset, Download and Import progress, and the top bar a
  Quit button; `main.ts` supplies those actions (#3).
- [`QuitDialog.ts`](./QuitDialog.ts) asks whether to keep or delete progress
  when quitting, then shows a goodbye screen with **Play again** (#3).
- [`QuitHint.ts`](./QuitHint.ts) tells the player to use Quit and highlights
  the button after they cancel the browser's close prompt (#133).
- [`progressFile.ts`](./progressFile.ts) downloads an exported progress file
  named `escape-route-progress-YYYY-MM-DD.json`.
- [`overworld/mapPreview.ts`](./overworld/mapPreview.ts) contains story copy,
  positions, route connections, and real addresses for the first six locations.
  Remaining `circus-preview` addresses are upcoming, unregistered locations.
- [`overworld/ResultsSummary.ts`](./overworld/ResultsSummary.ts) is the legacy
  mock results dialog; the map no longer mounts it. Cleared nodes replay their
  actual level instead.
- [`KonvaStage.ts`](./KonvaStage.ts) owns the page's one Konva stage. It is
  mounted in `LevelPanel`'s stage area and reset for each level that animates.
- [`animation/`](./animation/README.md) holds the animation engines and the
  guide to adding one for a level.
- [`forces/`](./forces/README.md) draws a free body diagram. The net force
  levels draw their crate with it, labelled "?" before an answer and with the
  typed values after.

`main.ts` creates the map, loads and saves its selected address through
`SaveManager`, and falls back to session-only interaction when browser storage
is unavailable. New saves start at the first real level with no completions;
old preview completions are not converted into real achievements.

**Start level** and **Replay level** open registered, available levels. Locked
levels cannot launch and unregistered locations report that they are coming soon.
Answer feedback works now. Levels with a run builder animate the answer on the
stage before the attempt is recorded (Minigame 1 Level 1 so far); drafts remain
a separate integration. See [level loading](../../docs/level-loading.md).

Tests for view behavior are in `src/view/**/*.test.ts`; browser journeys are in
`tests/e2e/`. See the
[overworld implementation guide](./overworld/README.md), the
[overworld preview design note](../../docs/overworld-preview.md), and
[testing plan](../../docs/testing/README.md).
