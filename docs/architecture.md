# Current application architecture

This document records the architecture that is implemented in the repository.
It describes the current browser preview and supporting services, not the full
planned game architecture. Proposed or issue-only components should remain in
their issue discussions until implementation has been integrated and reviewed.

## Runtime shape

The application is a TypeScript browser app built with Vite. `index.html` hosts
the `#app` element, and `src/main.ts` is the composition root: it loads saved
progress, prepares the preview's sample completion state, and constructs
`OverworldMap` with callbacks for saving the current selection and resetting
progress.

```text
index.html
    └── src/main.ts
         ├── SaveManager ── browser localStorage
         └── OverworldMap
              ├── mapPreview fixtures
              └── ResultsSummary (fixed sample values)
```

The current screen is a story-map preview. It does not launch a level, submit an
answer, run physics, or calculate results. Some model/controller services have
unit-tested behavior but are not wired into this screen.

## Code boundaries

| Area              | Responsibility implemented today                                                | Important boundary                                                                      |
| ----------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/view/`       | Story-map and sample-results presentation; Konva stage code                     | Konva imports stay in this directory. The map uses native controls and inline SVG.      |
| `src/controller/` | Text-to-number parsing, command types, ordered-level progression                | No implemented game-controller lifecycle currently composes these services.             |
| `src/model/`      | Answer validation, attempt tracking, checked kinematics helpers, level identity | Logic has no rendering dependency. The arithmetic helper is not a Matter.js simulation. |
| `src/data/`       | Versioned progress record and storage adapter                                   | Saves completed/current level addresses; no shipped level catalog or attempt history.   |
| `src/main.ts`     | Constructs and connects the currently used preview pieces                       | Connects `SaveManager` to `OverworldMap`; it is not a general dependency container.     |

The intended gameplay direction is for the view to express player actions through
controller commands, with the controller coordinating model services and data.
That end-to-end flow is not implemented. Do not infer that a type or isolated
service is already integrated merely because it appears in the original static
view or an issue.

## Current progress display and persistence

`SaveManager` reads a version 1 record from `escape-route-progress` in browser
storage. It validates addresses at runtime and returns an empty record for
malformed or unsupported serialized data. Storage exceptions are surfaced to
`main.ts`, which continues with session-only map interaction.

On a new or empty save, `main.ts` seeds the two sample cleared addresses from
`mapPreview.ts`. It filters saved addresses against the preview's known
placeholder IDs and passes the result into the map. `OverworldMap` computes the
display state in fixture order: saved completions are cleared, the first
remaining node is current, and later nodes are locked. Selecting a marker saves
the current address. Reset clears persistent progress and rerenders the map.

This preview-specific display algorithm is separate from `ProgressionSystem`.
Gameplay integration should replace fixture identities and connect real
progression and completion data in an implementation change before this design
is revised.

## Decision record and changes

Document a design choice here or in a focused `docs/` note after its code has
been integrated and the pull request review has settled the approach. Link the
implementing pull request and relevant issue, explain the constraints and
tradeoffs that shaped the decision, and update the note when behavior changes.
Use issue discussions for proposals and unresolved alternatives; do not present
those as current architecture.

The repo's focused notes describe implemented behavior:

- [Answer validation](./answer-validation.md)
- [Session progress and next-level selection](./progress-tracking.md)
- [Overworld story map preview](./overworld-preview.md)
- [Test responsibilities and current coverage](./testing/README.md)
