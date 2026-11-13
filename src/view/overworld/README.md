# Overworld preview implementation

This guide describes the implementation details that should stay synchronized
with changes to the overworld view. The broader architectural context is in
[`docs/architecture.md`](../../../docs/architecture.md); design behavior and
scope are recorded in [`docs/overworld-preview.md`](../../../docs/overworld-preview.md).

## Rendering and fixtures

- `OverworldMap.ts` renders native HTML controls and inline SVG scenery and route
  lines. It derives cleared/current/locked display state from completed IDs and
  the fixture order. It does not call `ProgressionSystem` or a game controller.
- `mapPreview.ts` owns node IDs, placeholder `circus-preview` addresses, story
  copy, chapter membership, positions on a 680 × 1770 reference map, and route
  connections. These addresses are not registered game levels.
- `ResultsSummary.ts` shows fixed sample accuracy and answer counts for two
  nodes. It does not calculate or persist scores.
- The existing `KonvaStage` is not mounted on the story map.

The current app seeds sample completions on an empty save. Selecting a map
marker saves its address; reset clears saved state and restores fixture defaults.
Other markers have disabled launch buttons. The clown is static artwork. Level
launch, movement, adjacency enforcement, and traversal are not implemented.

## UI behavior to preserve

The map scroll region is keyboard-focusable and markers are native buttons with
descriptive accessible labels. The layout moves from three columns to one on
narrow screens; motion must respect `prefers-reduced-motion`. The results modal
must close with Escape and its buttons, restore focus to its trigger, and leave
the map scroll position intact.

Update this guide and the relevant tests in the same pull request when fixture
shape, rendering behavior, interactions, persistence wiring, or accessibility
behavior changes. Browser coverage lives in `tests/e2e/`; view unit tests live
beside this code.
