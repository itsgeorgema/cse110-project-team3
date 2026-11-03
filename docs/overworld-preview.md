# Overworld story map preview

This note records the preview's product/design scope and architectural boundary.
Detailed implementation guidance that should change with view pull requests
lives in [`src/view/overworld/README.md`](../src/view/overworld/README.md). The
story levels and results here are presentation fixtures, not playable levels or
accepted game architecture.

## Rendering and data

[`OverworldMap`](../src/view/overworld/OverworldMap.ts) is mounted by
[`main.ts`](../src/main.ts). It uses native HTML controls and inline SVG scenery
and route lines. The existing Konva stage is not mounted on this screen.

[`mapPreview.ts`](../src/view/overworld/mapPreview.ts) owns the presentation
fixtures:

- `previewNodes`: marker IDs, positions on a 680 × 1770 reference map, story
  copy, chapter membership, and placeholder level addresses.
- `previewConnections`: pairs of marker IDs used to draw the route.
- `chapters`: chapter labels and scroll destinations.

The `circus-preview` game ID and numbered levels are not registered level data.
The `cleared`, `current`, and `locked` states and progress count are display
state. `OverworldMap` marks supplied completed addresses as cleared, then uses
fixture order to choose the current and locked markers. It does not call
`ProgressionSystem` or a game controller.

## Interactions and persistence

Selecting any marker updates the story preview and asks `main.ts` to save the
selected address. The app loads and saves this selection through `SaveManager`.
On an empty save, `main.ts` seeds the sample cleared addresses from the fixtures.
Reset clears the saved state and returns the map to its preview defaults.

Cleared markers can open [`ResultsSummary`](../src/view/overworld/ResultsSummary.ts).
It shows fixed sample accuracy values (90% and 80%) and correct-answer counts;
no score is calculated or saved. Other markers have disabled launch buttons.
The native modal supports Escape and return buttons, restores focus to its
trigger, and leaves map scroll position intact.

Chapter navigation and the return button scroll or select the current preview
node. The clown is static artwork, not a walking animation. Movement input,
adjacency enforcement, unlock enforcement through `ProgressionSystem`, level
launch, and gameplay traversal are not implemented on this screen.

## Integration boundary

Gameplay integration should replace fixture addresses with real level addresses
and source progress state from the implemented progression service. Route
selection should use controller commands when the level traversal flow is
implemented. Until then, this map remains a standalone preview backed by
presentation fixtures and saved preview state.
