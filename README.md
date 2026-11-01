# cse110-project-team3

CSE 110 Group 3's physics game: a clown escaping the circus, one physics problem at a time.
TypeScript, Vite, and Konva, with no framework.

## Setup

Requires Node 22 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

- `npm run lint`: ESLint checks with no warnings allowed; enforces Konva imports staying in `src/view/`
- `npm run format:check`: check formatting without changing files
- `npm run format`: apply Prettier formatting (two spaces, configured in `.editorconfig`)
- `npm run typecheck`: TypeScript check, no output files
- `npm run build`: typecheck, then a production build in `dist/`
- `npm run preview`: serve the production build

Before opening a pull request, run `npm run lint`, `npm run format:check`,
`npm run typecheck`, and `npm test`. CI checks linting and formatting on every
pull request and push to `main` (#52). Run `npm run format` to fix formatting;
review the resulting diff before committing.

### Fast tests and coverage

- `npm test`: run unit tests in Node without browsers or network services.
- `npm run test:contracts`: compile-check the parser/controller/model interfaces,
  including rejected payload shapes and readonly submissions (#25, #43).
- `npm run test:coverage`: run unit tests with V8 coverage; each executable file
  under `src/controller/`, `src/model/`, and `src/data/` must reach 90% statements,
  branches, functions, and lines. New logic files are included even without tests.

Unit tests live alongside their code as `*.test.ts`. Compile-only contract checks
live in `tests/contracts/`; these verify TypeScript compatibility, not runtime
validation. CI runs both and retains coverage reports for seven days. Open
`coverage/index.html` after a local coverage run for the detailed report.

Current runtime coverage is for `parseInput`: numerical syntax, finite-value
limits, field errors, immutable inputs, game/level identity, and separation from
answer correctness. Interface-only modules contain no executable behavior.
The percentage excludes the view and composition root, and does not claim
coverage of the unimplemented validator, physics, progression, or persistence.

### Browser tests

Install browser binaries once with `npx playwright install chromium firefox webkit`.
On Linux, use `npx playwright install --with-deps chromium firefox webkit` to also
install the operating-system dependencies.

- `npm run test:browser:types`: typecheck browser tests and their configuration.
- `npm run test:smoke`: two quick Chromium startup checks, at desktop and narrow
  viewport sizes.
- `npm run test:e2e`: all browser tests on Chromium, Firefox, and WebKit.

Playwright builds the production app with the GitHub Pages repository base path,
starts a disposable preview server on port 4173, and shuts it down afterward.
Leave that port free. Each test receives a fresh browser context and storage.
Tests fail on uncaught exceptions, console errors, failed requests, or HTTP errors.
There are no automatic retries to hide intermittent failures.

The current scaffold checks stage/canvas creation and dimensions, production asset
paths, and refresh without duplicate canvases. The narrow viewport check covers
initial layout, not live resizing or mobile-device compatibility. These tests do
not yet exercise gameplay. Only Chromium smoke tests are intended for the fast CI
gate; the full browser matrix belongs in scheduled/manual regression runs.

After a run, use `npx playwright show-report` to inspect the HTML report. Failure
screenshots, videos, traces, and a JUnit report are written under `test-results/`.
Run `npx playwright show-trace <trace.zip>` to inspect a retained trace.

## Deployment

GitHub Actions deploys the site to GitHub Pages on every push to `main`. The
workflow installs locked dependencies, audits for critical vulnerabilities, runs
tests, and typechecks/builds the app before deploying `dist/` to the
`github-pages` environment. Failed checks prevent deployment.

The site will be available at https://itsgeorgema.github.io/cse110-project-team3/.
The workflow's deployment environment also links to the published URL. To redeploy,
open **Actions → Deploy to GitHub Pages → Run workflow** and select `main`.
Deployments are restricted to `main` and run one at a time.

The build uses the base path supplied by GitHub Pages so bundled assets load
correctly under the repository URL. Local development keeps Vite's default base.
To check a Pages-style build locally:

```sh
npm run build -- --base /cse110-project-team3/
npm run preview -- --base /cse110-project-team3/
```

Open http://localhost:4173/cse110-project-team3/.

## Layout

`src/` mirrors the layers in our architecture doc's static view. Each folder's README lists the
classes that live there.

- `src/view/`: what the player sees and touches
- `src/controller/`: level and attempt lifecycle
- `src/model/`: logic and records, no rendering
- `src/data/`: level definitions and saved progress
- `src/main.ts`: builds the objects and wires them together

## Work

Sprint 1 issues: https://github.com/itsgeorgema/cse110-project-team3/issues?q=label%3A%22sprint+1%22
