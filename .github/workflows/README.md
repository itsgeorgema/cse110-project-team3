# GitHub Actions workflow implementation

This guide covers workflow behavior that should be updated alongside changes
to files in this directory. The user-facing commands, deployment overview, and
test policy are summarized in the root [`README.md`](../../README.md); the test
acceptance matrix lives in [`docs/testing/README.md`](../../docs/testing/README.md).

## Workflow responsibilities

- `ci.yml` runs on pushes, pull requests, merge queue, and manual dispatch. It
  calls `quality.yml`, then exposes the stable required `CI gate`. A push or
  manual run on `main` deploys only after that gate succeeds.
- `quality.yml` is shared by CI and scheduled browser regression. Its `fast` job
  runs lint, formatting, type and contract checks, CI policy checks, unit
  coverage, changed-line coverage where applicable, and the critical dependency
  audit. Its `smoke` job runs only after `fast`, builds/tests the Pages-path
  production site, then uploads the tested `dist/` artifact.
- `cd.yml` downloads that exact tested artifact and publishes it to Pages. It
  does not rebuild the app.
- `regression.yml` calls the shared quality workflow, then runs the full E2E
  suite independently on Chromium, Firefox, and WebKit.
- `security.yml` and `pr-test-policy.yml` handle security analysis and test
  change policy respectively; they are separate checks from the CI deployment
  gate.

## Workflow change requirements

Keep deploy permissions limited to the deployment job and the reusable deploy
workflow. Preserve `contents: read` for build and test jobs. Deploy only the
artifact produced by the successful smoke job. Keep the `CI gate` required check
stable when restructuring jobs, and ensure it fails when required work fails,
is cancelled, or is skipped. Update workflow documentation, the root README,
and regression/CI acceptance notes in the same pull request when triggers,
required checks, artifact flow, or deployment behavior change.
