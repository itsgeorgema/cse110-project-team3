# `src/view/`

This layer renders the current browser experience and handles direct user
interaction. Konva imports are restricted to this directory by ESLint. The
current app is a story-map preview; playable minigame screens and a controller
connection are not implemented.

## Implemented files

- [`overworld/OverworldMap.ts`](./overworld/OverworldMap.ts) renders the story
  map with native HTML controls and inline SVG scenery. Marker selection changes
  the story preview. It derives a sequential display state from supplied
  completed addresses; it does not call `ProgressionSystem`.
- [`overworld/mapPreview.ts`](./overworld/mapPreview.ts) contains presentation
  fixtures: story copy, placeholder `circus-preview` addresses, map positions,
  chapter headings, and route connections. These are not registered game
  levels.
- [`overworld/ResultsSummary.ts`](./overworld/ResultsSummary.ts) displays fixed
  sample results for two markers in a native dialog. These numbers are not
  calculated or persisted.
- [`KonvaStage.ts`](./KonvaStage.ts) contains the existing Konva stage
  implementation. The story-map preview does not mount it.

`main.ts` creates the map, loads and saves its selected address through
`SaveManager`, and falls back to session-only interaction when browser storage
is unavailable. The first run seeds sample cleared addresses for the preview.
That seed is presentation data, not earned game progress.

Tests for view behavior are in `src/view/**/*.test.ts`; browser journeys are in
`tests/e2e/`. See the
[overworld implementation guide](./overworld/README.md), the
[overworld preview design note](../../docs/overworld-preview.md), and
[testing plan](../../docs/testing/README.md).
