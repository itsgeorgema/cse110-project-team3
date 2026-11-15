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
  the story preview. It derives a sequential display state from supplied
  completed addresses; it does not call `ProgressionSystem`.
- [`overworld/mapPreview.ts`](./overworld/mapPreview.ts) contains story copy,
  positions, route connections, and real addresses for the first four locations.
  Remaining `circus-preview` addresses are upcoming, unregistered locations.
- [`overworld/ResultsSummary.ts`](./overworld/ResultsSummary.ts) is the legacy
  mock results dialog; the map no longer mounts it. Cleared nodes replay their
  actual level instead.
- [`KonvaStage.ts`](./KonvaStage.ts) contains the existing Konva stage
  implementation. The story-map preview does not mount it.

`main.ts` creates the map, loads and saves its selected address through
`SaveManager`, and falls back to session-only interaction when browser storage
is unavailable. New saves start at the first real level with no completions;
old preview completions are not converted into real achievements.

**Start level** and **Replay level** open registered, available levels. Locked
levels cannot launch and unregistered locations show **Level coming soon**.
Answer feedback works now; completion recording, drafts, and animated physics
remain separate integrations. See [level loading](../../docs/level-loading.md).

Tests for view behavior are in `src/view/**/*.test.ts`; browser journeys are in
`tests/e2e/`. See the
[overworld implementation guide](./overworld/README.md), the
[overworld preview design note](../../docs/overworld-preview.md), and
[testing plan](../../docs/testing/README.md).
