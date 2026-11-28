# Overworld implementation

This guide describes the implementation details that should stay synchronized
with changes to the overworld view. The broader architectural context is in
[`docs/architecture.md`](../../../docs/architecture.md); design behavior and
scope are recorded in [`docs/overworld-preview.md`](../../../docs/overworld-preview.md).

## Rendering and level bindings

- `OverworldMap.ts` renders native HTML controls and inline SVG scenery and route
  lines. It reads coordinates/connections from `OverworldGraph` and delegates
  status and selection to `OverworldNavigation`, which uses `ProgressionSystem`.
- `mapPreview.ts` binds each of the twelve locations to a registered level.
  The unbuilt "The final swing" placeholder was removed (#161); add a location
  only once its level exists. Positions use a 680 × 1770 reference map.
- Available registered locations expose **Start level** or **Replay level**.
  The composition root opens `LevelPanel` and loads through `LevelSession`.
  Locked locations remain disabled; unregistered locations cannot launch.
- `ResultsSummary.ts` is retained legacy code, no longer mounted by the map.
  The existing `KonvaStage` is not mounted yet.

New saves start with no completions. Old `circus-preview` completions are not
mapped to real level achievements. Only accepted neighboring selections save their address; reset
clears progress and returns selection to the first level. The clown moves to
the accepted location immediately. Smooth walking remains separate animation
work; adjacency and unlock rules are enforced now. Answer
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

## Routing contract

`OverworldNavigation.checkDestination(level)` returns either a failure reason
and player-facing message or the immutable `from`/`to` nodes and coordinates.
It does not change position. `selectLevel(level)` rechecks the same rules and
commits an accepted destination. Unknown, locked, unimplemented, and non-adjacent
locations are rejected without changing the current selection or saved address.
The current location can be reopened without a move. Markers announce refusal
through a live status message and expose `aria-disabled`; the handler still
checks the rules, including for keyboard activation.

A valid saved position restores directly. Invalid, locked, or unimplemented
positions fall back to the first available unfinished registered level, or the
last available registered level when all implemented levels are completed.
Completion is read through an injected query; navigating never awards progress.

The full flow and animation handoff are in
[`docs/overworld-routing.md`](../../../docs/overworld-routing.md).
