# Project documentation

This directory is the home for project architecture, implemented design
decisions, and testing guidance. Documents describe behavior that exists in the
repository. Proposals and unresolved options belong in GitHub issues until code
has been integrated and reviewed; pull request review settles conflicting
approaches. Update the relevant note with the implementing change.

## Architecture and design

- [Current application architecture](./architecture.md): runtime composition,
  layer responsibilities, and the current storage and map-preview flow.
- [Answer validation](./answer-validation.md): validator contract, input
  requirements, bounds, and tolerance behavior.
- [Physics simulation](./physics-simulation.md): how a run is recorded as copied
  `SimulationState` snapshots, the runner seam, and where matter-js is isolated.
- [Session progress and next-level selection](./progress-tracking.md): attempt
  snapshots, completion, and ordered level availability.
- [Overworld story map preview](./overworld-preview.md): scope and design
  boundaries for the current presentation fixture.

## Quality and operations

- [Testing plan](./testing/README.md): existing coverage, issue-linked test
  acceptance, and guidance for adding tests with implemented features.
- [Repository overview, scripts, CI, and deployment](../README.md): local setup,
  checks, browser tests, GitHub Actions, and Pages deployment.

Implementation guides that must change with code are kept beside their code:
[`src/view/overworld/README.md`](../src/view/overworld/README.md) documents the
map UI details, and [`.github/workflows/README.md`](../.github/workflows/README.md)
documents workflow responsibilities and constraints. Source directories also
contain concise READMEs for local code orientation.
