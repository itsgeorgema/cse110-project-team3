# Overworld implementation

This guide describes the implementation details that should stay synchronized
with changes to the overworld view. The broader architectural context is in
[`docs/architecture.md`](../../../docs/architecture.md); design behavior and
scope are recorded in [`docs/overworld-preview.md`](../../../docs/overworld-preview.md).

## Rendering and level bindings

- `OverworldMap.ts` renders native HTML controls and inline SVG scenery and route
  lines. It derives cleared/current/locked state from saved completions and map
  order. It does not yet call `ProgressionSystem`.
- `mapPreview.ts` binds the first three locations to kinematics levels 1–3 and
  the fourth to the implemented net-force level 2. Remaining locations retain
  unregistered placeholder addresses. Positions use a 680 × 1770 reference map.
- Available registered locations expose **Start level** or **Replay level**.
  The composition root opens `LevelPanel` and loads through `LevelSession`.
  Locked locations remain disabled; unregistered locations cannot launch.
- The existing `KonvaStage` is not mounted yet.

New saves start with no completions. Old `circus-preview` completions are not
mapped to real level achievements. Selecting a marker saves its address; reset
clears progress and returns selection to the first level. The clown is still
static artwork; walking and adjacency enforcement remain #22 work. Answer
checking works, while recording completion after playback remains controller
integration work.

## UI behavior to preserve

The map scroll region is keyboard-focusable and markers are native buttons with
descriptive accessible labels. The layout moves from three columns to one on
narrow screens; motion must respect `prefers-reduced-motion`. The level dialog
must close with Escape and its buttons, restore focus to its trigger, and leave
the map scroll position intact.

Update this guide and the relevant tests in the same pull request when fixture
shape, rendering behavior, interactions, persistence wiring, or accessibility
behavior changes. Browser coverage lives in `tests/e2e/`; view unit tests live
beside this code.
