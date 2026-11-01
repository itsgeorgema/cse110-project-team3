# Testing the physics game

This plan maps all 44 non-PR GitHub issues present on 2026-10-31 to test
responsibilities. Issue closure is not evidence that a feature exists in this
checkout: several closed design issues describe behavior that is not implemented.
The current system is one browser application (TypeScript, Vite, Konva), with no
backend API or database. Tests should follow those actual boundaries.

## What runs today

| Layer              | Implemented coverage                                                                                                       | Execution                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Static             | ESLint, formatting, strict TypeScript, Konva import restriction                                                            | Every branch push, PR, merge queue, manual CI       |
| Unit               | 35 parser cases: decimal syntax, finite values, errors, immutable inputs, game/level identity                              | Same fast job, with 90% per-file coverage minimum   |
| Contract           | Compile-only checks for raw input, parsed input, submission units, readonly values, and result narrowing                   | Same fast job                                       |
| Integration        | No runtime service integration yet; controller, validator, physics, and save services are not implemented                  | Add real boundary tests with each implementation    |
| Browser smoke      | Two Chromium checks: desktop/narrow viewport, real production assets, one full-size Konva stage, no browser/network errors | After fast checks pass                              |
| Browser regression | Those startup checks plus refresh, across Chromium, Firefox, WebKit: nine cases today                                      | Nightly/manual after quality checks                 |
| Security           | Critical dependency audit; separate CodeQL analysis and weekly dependency updates                                          | Audit in fast gate; CodeQL on PR/main/weekly/manual |

The coverage denominator includes executable code in `src/controller/`,
`src/model/`, and `src/data/`, including files with no tests. Interface-only files
have no runtime behavior. The current parser is fully covered; that does not
mean the entire planned game is covered. View/composition code is outside this
percentage and receives browser coverage. Compile-only contract tests do not
validate JSON, localStorage, or numerical correctness at runtime.

## Where tests belong

Use the testing pyramid as a design guide: roughly 70% unit, 20% integration,
10% end-to-end. Do not manufacture tests to satisfy a numeric ratio. Prefer
many numerical and state-transition cases in Node and a few complete journeys
in browsers. See the [AWS testing stages whitepaper](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/testing-stages-in-continuous-integration-and-continuous-delivery.html).

- Put pure logic tests beside source as `*.test.ts`; `npm test` and
  `npm run test:coverage` discover them. Use deterministic data, explicit time
  steps, seeded randomness where needed, and fake clocks for event timing.
- Keep compile-only interface checks in `tests/contracts/`. Run
  `npm run test:contracts`. Use `@ts-expect-error` for payloads that must remain
  invalid; unused directives fail compilation.
- Add small Node integration tests beside the controller/data implementation as
  `*.integration.test.ts`. The current `src/**/*.test.ts` pattern includes them.
  They may run in the fast gate while inexpensive. Compose real services and
  replace only external boundaries such as storage or animation scheduling.
- Put real-browser tests in `tests/e2e/`, importing the shared fixture so errors
  and failed requests fail the test. `npm run test:browser:types` checks their
  types. Tag only essential journeys `@smoke`; the full suite runs nightly.
- When integration tests require heavier environments, split their discovery
  into an explicit Vitest project/config, add a nonempty integration command,
  and put its CI job after fast checks and before smoke. Do not add empty green
  jobs or `passWithNoTests` to imply coverage that does not exist.

No network service is needed for today's unit tests. Browser tests build a fresh
production site, start a local preview server, and receive isolated browser
contexts/storage. Do not add Docker, a database, Pact, or an API mock server until
an actual service boundary requires it. If a backend is introduced, its change
must also introduce disposable test storage, migrations/fixtures, runtime schema
checks, and consumer/provider contract verification.

## Issue acceptance matrix

**Current** identifies runnable coverage already in the checkout. **Next** is an
acceptance requirement to implement alongside its feature, not a skipped test or
an assertion against an invented implementation. Issue links are the source of
scope; newer narrow issues take precedence over older umbrella descriptions.

| Issues                                                                                                                                                                                                                              | Current evidence                                      | Next unit/contract tests                                                                                                                  | Next integration/browser acceptance                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [#1](https://github.com/itsgeorgema/cse110-project-team3/issues/1), [#33](https://github.com/itsgeorgema/cse110-project-team3/issues/33): scaffold                                                                                  | Strict TS, production build, real Konva startup       | Keep pure logic free of rendering dependencies                                                                                            | Preserve clean startup under the Pages subpath                                                                                   |
| [#2](https://github.com/itsgeorgema/cse110-project-team3/issues/2): precision                                                                                                                                                       | Not implemented                                       | Independent reference answers; absolute/relative errors; tiny/large magnitudes; rounding only at display boundaries                       | Same answer accepted through controller as through validator; document source and precision of reference values                  |
| [#3](https://github.com/itsgeorgema/cse110-project-team3/issues/3): broader save/reset/export                                                                                                                                       | Deferred beyond #42                                   | Versioned import/export validation, unknown IDs, corrupt input, reset scope                                                               | Download/upload round trip, explicit quit-save/quit-delete; test tab-close warning only after its interaction contract is agreed |
| [#4](https://github.com/itsgeorgema/cse110-project-team3/issues/4), [#12](https://github.com/itsgeorgema/cse110-project-team3/issues/12): menus/map                                                                                 | No runtime menu coverage                              | Node identity and locked/current/completed mapping                                                                                        | Start, select unlocked level, refuse locked selection, replay completed level, render results from real state                    |
| [#5](https://github.com/itsgeorgema/cse110-project-team3/issues/5), [#20](https://github.com/itsgeorgema/cse110-project-team3/issues/20): projectile motion                                                                         | Not implemented                                       | Known 45-degree flight; initial/final positions; time roots; velocity/displacement; degree/radian conventions; invalid parameters         | Valid shot follows independent snapshots; wrong answer gives feedback and remains retryable                                      |
| [#6](https://github.com/itsgeorgema/cse110-project-team3/issues/6), [#14](https://github.com/itsgeorgema/cse110-project-team3/issues/14): car velocity                                                                              | Not implemented                                       | Reference `distance / time`; reject zero/invalid time according to agreed domain                                                          | Load real level 1 data, show correct units, submit, animate, complete                                                            |
| [#15](https://github.com/itsgeorgema/cse110-project-team3/issues/15): car distance                                                                                                                                                  | Not implemented                                       | Reference `velocity * time`, zero velocity, signed displacement if supported                                                              | Level 2 problem text, expected answer, and simulation agree                                                                      |
| [#16](https://github.com/itsgeorgema/cse110-project-team3/issues/16): car acceleration                                                                                                                                              | Not implemented                                       | Reference `(target - initial velocity) / time`; deceleration and invalid time                                                             | Level 3 input feeds the correct simulation parameters                                                                            |
| [#17](https://github.com/itsgeorgema/cse110-project-team3/issues/17): two-answer car level                                                                                                                                          | Parser handles multiple fields                        | Average velocity and accelerated displacement against independent references                                                              | Two labeled fields/units; one wrong field prevents success; both right complete only after playback                              |
| [#7](https://github.com/itsgeorgema/cse110-project-team3/issues/7), [#18](https://github.com/itsgeorgema/cse110-project-team3/issues/18): force                                                                                     | Not implemented                                       | Reference `mass * acceleration`; invalid mass; agreed signs and units                                                                     | Real force config → input → validator → crate playback → attempt                                                                 |
| [#19](https://github.com/itsgeorgema/cse110-project-team3/issues/19): opposing forces                                                                                                                                               | Not implemented                                       | Resting crate has zero net force; gravity/normal force magnitudes and directions                                                          | Zero is accepted as an answer; labels and playback match equilibrium                                                             |
| [#8](https://github.com/itsgeorgema/cse110-project-team3/issues/8), [#13](https://github.com/itsgeorgema/cse110-project-team3/issues/13): aim by eye                                                                                | Not implemented; #13 is the newer scope               | Valid angle interval endpoints; selected successful angle retained; retries do not incur unintended penalties                             | Slider launch, retry, follow-up using the player's angle; replay rewards/history only when specified                             |
| [#9](https://github.com/itsgeorgema/cse110-project-team3/issues/9): circular motion                                                                                                                                                 | Not implemented                                       | Centripetal force and minimum safe speed references; normal force at zero boundary; invalid radius/mass                                   | Pause for input, show forces, resume or fail/retry without duplicate callbacks                                                   |
| [#10](https://github.com/itsgeorgema/cse110-project-team3/issues/10): momentum                                                                                                                                                      | Not implemented                                       | Independent elastic-collision examples; momentum/energy conservation within tolerance; invalid mass                                       | Consecutive stages use the previous outcome; wrong step cannot bypass later calculations                                         |
| [#11](https://github.com/itsgeorgema/cse110-project-team3/issues/11): 80% skill gate                                                                                                                                                | Closed issue, absent code; explicitly deferred by #41 | Below/exactly/above 80%; zero-attempt policy; rounding cannot turn failure into success                                                   | Results summary and map gate use the same score; add only when scope is reactivated                                              |
| [#21](https://github.com/itsgeorgema/cse110-project-team3/issues/21): level loading                                                                                                                                                 | Partial TS config contract only                       | Required keys, unique `(gameId, levelId)`, finite expected answers, valid bounds/tolerance, supported animation name                      | Real valid configs load; malformed data is refused before rendering with a recoverable error                                     |
| [#22](https://github.com/itsgeorgema/cse110-project-team3/issues/22): traversal                                                                                                                                                     | Not implemented                                       | Walk start/end, frame count, even spacing, invalid duration/fps policy; adjacency                                                         | Only unlocked adjacent nodes call `selectLevel`; animation finishes at selected node                                             |
| [#23](https://github.com/itsgeorgema/cse110-project-team3/issues/23): playback events                                                                                                                                               | Not implemented                                       | Finish once; unsubscribe; stop stays silent; replay and listener cleanup                                                                  | Real controller plus deterministic fake animation: progress waits for finish and ignores stopped/stale playback                  |
| [#24](https://github.com/itsgeorgema/cse110-project-team3/issues/24): stage/factory                                                                                                                                                 | Stage startup and refresh tested; Konva import rule   | Factory rejects unknown names; strategies consume records without engine internals                                                        | Demo draws supplied snapshots and emits finish; switching scenes cleans up layers/listeners                                      |
| [#25](https://github.com/itsgeorgema/cse110-project-team3/issues/25): input                                                                                                                                                         | 35 parser tests and compile-only boundary checks      | Add unit-attachment and command-routing cases with controller implementation                                                              | Data-driven fields; raw invalid input never reaches validator; draft routed to tracker                                           |
| [#26](https://github.com/itsgeorgema/cse110-project-team3/issues/26): controller state                                                                                                                                              | Interfaces only                                       | Readonly state, command ordering, duplicate/stale callbacks                                                                               | Real tracker + controller; record once after playback; interrupted attempt does not complete                                     |
| [#40](https://github.com/itsgeorgema/cse110-project-team3/issues/40), [#43](https://github.com/itsgeorgema/cse110-project-team3/issues/43), [#44](https://github.com/itsgeorgema/cse110-project-team3/issues/44): answer validation | Interface contracts only; no runtime validator        | Missing/nonfinite values, wrong identity, bounds endpoints, tolerance endpoints, zero/negative answers, multiple fields, malformed config | Real parser → controller unit attachment → real validator; validation alone must not alter progress/UI                           |
| [#41](https://github.com/itsgeorgema/cse110-project-team3/issues/41): progression                                                                                                                                                   | Not implemented                                       | Wrong attempts retryable, correct attempts complete after playback, replay preserves completion, games sharing level 1 stay distinct      | Map queries real progression; finishing one game never unlocks another accidentally                                              |
| [#42](https://github.com/itsgeorgema/cse110-project-team3/issues/42): localStorage                                                                                                                                                  | Not implemented                                       | Versioned round trips; missing/corrupt/unsupported saves; invalid IDs; reset; storage exceptions                                          | Browser reload restores completion; reset removes it; blocked storage permits session play                                       |
| [#37](https://github.com/itsgeorgema/cse110-project-team3/issues/37), [#57](https://github.com/itsgeorgema/cse110-project-team3/issues/57): engine/snapshots                                                                        | No physics engine yet                                 | Fixed-step deterministic runs; earlier nested position/velocity values survive later updates and source body mutation                     | Actual engine adapter produces copied records consumed by view; no matter-js bodies cross the boundary                           |

## Repository and process issues

These issues need repository checks or human review rather than fabricated game
unit tests. This table records acceptance evidence, not administrator setup steps.

| Issues                                                                                                                                                       | Evidence and remaining scope                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#27](https://github.com/itsgeorgema/cse110-project-team3/issues/27): setup umbrella                                                                         | Review sub-issue evidence individually; a green scaffold does not complete every setup task                                                                                                                         |
| [#28](https://github.com/itsgeorgema/cse110-project-team3/issues/28): CI                                                                                     | Typecheck, real unit tests, coverage threshold, critical dependency audit; a failing stage prevents smoke/deployment                                                                                                |
| [#29](https://github.com/itsgeorgema/cse110-project-team3/issues/29): contributor rules/PR gate                                                              | Konva import boundary enforced. Contributor allowlist/PR-closing automation is not implemented by this CI work; it requires its own reviewed policy and must never execute untrusted PR code with write credentials |
| [#30](https://github.com/itsgeorgema/cse110-project-team3/issues/30): ADRs                                                                                   | Human review of architecture deltas and decisions; formatting checks do not validate architecture correctness                                                                                                       |
| [#31](https://github.com/itsgeorgema/cse110-project-team3/issues/31): code review                                                                            | Stable `CI gate` status exists; review guide and branch-policy enforcement remain separate from test behavior                                                                                                       |
| [#32](https://github.com/itsgeorgema/cse110-project-team3/issues/32): Pages                                                                                  | Smoke tests exercise production assets under repository base path; deployment consumes the same tested artifact. A local preview does not verify GitHub's live hosting service                                      |
| [#35](https://github.com/itsgeorgema/cse110-project-team3/issues/35), [#36](https://github.com/itsgeorgema/cse110-project-team3/issues/36): licenses/notices | When added, test that notices are reachable and required dependency entries exist; license selection/compatibility still needs human review                                                                         |
| [#52](https://github.com/itsgeorgema/cse110-project-team3/issues/52): style                                                                                  | EditorConfig, ESLint, Prettier, local scripts, CI checks                                                                                                                                                            |
| [#59](https://github.com/itsgeorgema/cse110-project-team3/issues/59): merged branches                                                                        | Repository behavior verified after merging a real PR; no runtime game test applies                                                                                                                                  |

## High-value boundary tests to add first

1. **Input to validation (#25, #44):** use actual level fixtures, parser, and
   validator. Spy on the validator boundary only in rejection cases to prove
   invalid raw fields never reach it. Check attached unit labels and identity.
2. **Submission to progression (#23, #26, #41):** use the real controller and
   tracker with a controllable animation fake. Assert incomplete before finish,
   completed after one finish, unchanged after duplicates, and incomplete after
   stop or an incorrect answer. Change levels mid-playback to catch stale events.
3. **Physics to animation (#57, #24):** produce frames with the actual adapter,
   retain early snapshots, advance/mutate engine bodies, and compare nested
   values. Assert view input is ordinary records, not live physics objects.
4. **Progress to persistence (#42):** serialize real tracker state, reconstruct a
   fresh tracker through SaveManager, and compare completion/availability. In a
   browser, refresh and reset using actual localStorage. Inject storage failures
   explicitly; do not make every integration test a mock-only round trip.
5. **Data to UI (#21, #17):** load the real two-answer level and verify field names,
   units, problem text, expected values, and animation registry agree. A fixture
   cannot replace checking the shipped level catalog.

Until level schemas are agreed, do not turn example issue snippets into a runtime
API: the issues use `gameName`, `gameId`, `kinematics`, and `carKinematics`
inconsistently. Resolve the canonical vocabulary with the feature implementation,
then validate the entire level catalog and unique compound addresses in CI.

For answer comparison, use the agreed rule in
[answer-validation.md](../answer-validation.md): allowed error is
`max(absolute, relative * abs(expected))`, relative defaults to zero, and bounds
and tolerance endpoints are inclusive. Test exact endpoints with representable
values and separate nearby values just inside/outside. Expected numerical results
must come from independently derived examples, not a second call to the function
under test.

## Keeping browser and slow tests focused

As gameplay arrives, add a small smoke journey through one representative
minigame: load → reject bad input → submit correct answer → finish playback →
observe completion. Put the other minigame, two-field level, retries, locked
navigation, save/refresh/reset, and later game modules into full regression.
Use accessible roles/labels for controls when available, stable test identifiers
for canvas interaction when necessary, and observable state transitions instead
of fixed sleeps. Verify numerical outcomes in Node; screenshots alone cannot
prove physics or progression correctness.

Performance/load testing is **not implemented**: there is no backend to load and
no physics/playback workload yet. When #37/#57 and animation land, add a separate
scheduled/manual performance workflow with a seeded maximum supported level,
fixed timestep/frame count, warmup, repeated measurements, and machine-readable
reports. Measure simulation duration, snapshot size, playback frame timing, and
retained listeners/objects after repeated runs. Agree budgets from a measured
baseline on a documented runner before making them blocking. Do not use a busy
shared runner's single timing sample as a PR gate. If an API appears later, add
service load tests against a disposable environment with explicit resource limits.

Manual acceptance still covers teaching clarity, narrative, readable force labels,
visual quality, and accessibility of canvas interactions. Record these findings in
the feature PR; passing automation does not establish those qualities.

## Updating coverage with a feature

Link the issue in the PR, add executable tests with the behavior, and update this
matrix's current evidence. Do not mark future rows covered just because an
interface compiles. Keep regression cases isolated, do not use retries to conceal
flakiness, and investigate artifacts from failures. See the root
[README](../../README.md) for commands, report locations, and workflow cadence.

The PR test policy requires changed application files to be accompanied by test
additions or updates under `src/**/*.test.ts`, `tests/contracts/`, or `tests/e2e/`.
Deleting or only renaming tests does not satisfy it. Documentation-only changes
do not need tests. A reviewer-approved `tests-exempt` exception with a specific
rationale covers cases such as a refactor already exercised by existing tests;
the approving reviewer must have write access and approve the current head.
Label, description, review, and commit events reevaluate the policy.

Changed-line coverage independently checks at least 90% of changed executable
lines in each changed logic file. Comments and type-only lines have no executable
coverage; missing coverage records fail rather than silently disappearing. These
checks cannot prove that a test is relevant: a test-file edit alone is not enough
for review approval. Reviewers must check failure cases, boundaries, and whether
real component interactions are exercised. CI/configuration changes are covered
by the repository's CODEOWNERS entries so changes to these rules receive review.
