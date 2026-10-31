# Overworld story map (UI preview)

`OverworldMap` is mounted by `src/main.ts`. It uses native HTML for accessible
controls and SVG for the illustrated scenery and route. The existing Konva stage
is unchanged and is not mounted on this UI-only screen.

`mapPreview.ts` owns the presentation fixtures:

- `previewNodes`: stable marker IDs, positions on a 680 × 1770 reference map,
  story copy, chapter membership, and placeholder `LevelAddress` values.
- `previewConnections`: explicit pairs of connected marker IDs. Both the path
  and markers use the same coordinates, so they remain aligned when resized.
- `chapters`: chapter labels and scroll destinations.

The `circus-preview` game ID and numbered levels are **not registered level data**.
The cleared/current/locked states and progress count are sample presentation data.
They do not calculate unlocks, persist progress, or call a controller.

Clicking any marker (including a locked marker) only previews its story. Every
launch button is disabled. Chapter navigation and the return button only scroll
or update the selected preview; the clown remains at the sample current node.

For later integration, replace the fixture addresses with the level team's real
addresses and supply states from ProgressionSystem. Wire level selection through
GameCommands only when implementing the traversal ticket. Walking frames,
OverworldAnimation, movement input, and adjacency/unlock enforcement are outside
this UI implementation. The static decorative clown is not a walk animation.

The layout adapts from three columns to a single column on phones. The map is a
keyboard-focusable scroll region; its markers are native buttons with selected
states and descriptive labels. Decorative motion respects reduced-motion settings.
Typography uses Google Fonts with local serif/sans-serif fallbacks.
