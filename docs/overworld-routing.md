# Overworld graph and routing (#22)

Players select available neighboring locations, see the character move to the
selected node, and open that node's real level through the #21 loading flow.
Selections that skip an edge, enter a locked location, or target an unimplemented
level are refused with a message. Refused selections do not overwrite position
or the saved address. Returning along an edge to replay a completed level works.

This implements the graph/layout/level-binding portion of #22. Position changes
are immediate; `makeWalkFrames` and `OverworldAnimation` are still separate work.
Do not close the entire issue until its animation acceptance criteria are met.

## Responsibilities

- `OverworldGraph` validates the node and edge data, copies and freezes it, and
  resolves IDs, level identities, neighbors, and coordinates. Connections are
  undirected. It does not infer edges from level order.
- `OverworldNavigation` combines that topology with the existing
  `ProgressionSystem` and registered level identities. `status` supplies the
  display state; `checkDestination` returns a route or failure without moving;
  `selectLevel` commits only an accepted route. `current` is the character's
  position and is distinct from the next unfinished level.
- `OverworldMap` reads graph coordinates and edges, requests selections, and
  displays refusal messages. Accepted selections update the character and
  story panel while preserving map scroll and focusing the selected marker.
  Its old duplicate unlock calculation has been removed.
- `main.ts` constructs these dependencies, supplies a live completion query over
  loaded save data, and persists accepted moves. Reset clears the completion
  query before resetting navigation. `LevelSession` still owns level loading.

The existing `mapPreview.ts` file is the single source of node positions, story
metadata, edges, and level bindings. Every node references a registered
level. The graph is constructed from
that data once in the composition root. The graph's node order supplies the
existing linear progression order; graph connections independently control
which moves are possible. A branching unlock policy would require separate
changes to `ProgressionSystem`.

## Restore and reset

An available registered saved position is restored directly, including completed
levels. A missing, unknown, locked, or unimplemented saved position falls back to
the first available unfinished registered level. If none remains, the last
available registered level is used. A catalog with no available starting level
is a configuration error. Navigating or loading a level never awards completion.

## Animation handoff

Before starting a walk, call `checkDestination(level)` and use a successful
result's `from` and `to` coordinates to build frames. On successful completion,
call `selectLevel(level)` to revalidate and commit, then update the map and persist
the accepted address. The animation integration must block overlapping movement
requests and cancel pending completion callbacks on stop/reset/disposal; this
PR does not implement that asynchronous lifecycle. Currently the map calls
`selectLevel` immediately and redraws the character at its destination.

The frame generator should consume graph coordinates rather than reconstructing
positions from DOM pixels. Current coordinates are in the map's 680 × 1770
reference space; the view applies responsive scaling.

## Verification and manual example

Run the existing scripts: `npm run test:coverage` for graph/navigation tests and
`npm run test:e2e` for production browser journeys. The route journey is tagged
`@smoke` so it runs in existing PR CI. Static checks use the existing lint,
format, TypeScript, contract, and browser-typecheck commands.

The browser fixture in `tests/e2e/overworld-navigation.spec.ts` starts at
kinematics level 1 with levels 1 and 2 completed. It verifies that a direct jump
to level 3 fails, moving through level 2 succeeds, level buttons open the correct
problems, reload restores position, backward travel works, and reset relocks
later locations. Fixtures are confined to tests; production does not seed earned
progress. Unit tests cover invalid graphs, exact level identity, restore
fallbacks, unknown/unimplemented targets, live completion queries, and rejected
movement without state changes.

For manual navigation testing before completion playback is integrated, use a
disposable browser profile and the same version-1 save fixture: completed
addresses `kinematics/1` and `kinematics/2`, with current address `kinematics/1`,
under the `escape-route-progress` localStorage key. The browser suite provides
the exact fixture and is the repeatable way to run this scenario. Normal new
players start at level 1; unlocking through earned completion remains #80 work.

## PR dependency

This work is based on `feat/21-level-loading` (PR #98). While that PR is open,
use it as the #22 PR base to isolate the graph/routing diff. After #21 merges,
retarget to `main` and resolve any integration changes before rerunning CI.
Reference #22 as related work rather than claiming to complete the walking
animation. The reviewer should verify both routing behavior and the animation
handoff before merge.
