# `src/controller/`

The controller layer defines the boundary between player actions and application
logic. The current implementation contains input parsing and a progression
service; it does not yet contain the planned game controller or level lifecycle.

## Implemented files

- [`GameCommands.ts`](./GameCommands.ts) defines the actions the view can request:
  submit an answer, save a draft, or select a level. `RawInput` carries typed
  strings and a `LevelAddress` identity. This is an interface, not an
  implementation of those actions.
- [`parseInput.ts`](./parseInput.ts) converts the configured fields from text to
  finite numbers. It reports field-specific errors for missing, malformed, or
  non-finite values. It does not check bounds or whether an answer is correct;
  those belong to the validator.
- [`ProgressionSystem.ts`](./ProgressionSystem.ts) receives an ordered list of
  level addresses and a completion query. It reports availability and the next
  level after success. It does not load level data, save progress, or control
  playback.

`main.ts` is currently the composition root. It wires browser storage to the
overworld preview directly. It does not yet construct a game controller.

## Intended boundary

The view sends raw player actions through `GameCommands`. A future controller
implementation can parse input, obtain the selected level configuration, call
model services, and coordinate playback and progress. Until those connections
exist in code, this README describes only the implemented parser, progression
service, and command interface. Record proposed behavior on the relevant issue;
document the architecture decision after implementation is reviewed and merged.

Tests live beside the implementation as `*.test.ts`. See the
[testing plan](../../docs/testing/README.md) for current coverage and feature
acceptance expectations.
