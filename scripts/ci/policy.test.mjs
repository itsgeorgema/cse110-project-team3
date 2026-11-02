import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addedLines,
  parseLcov,
  evaluateCoverage,
} from "./changed-coverage.mjs";
import {
  checkTestChanges,
  latestReviews,
  enforce,
  rationaleText,
} from "./pr-test-policy.mjs";

test("rationale ignores template comments without joining surrounding fragments", () => {
  assert.equal(
    rationaleText("<!-- Instructions -->\nExisting tests cover this."),
    "Existing tests cover this.",
  );
  assert.equal(rationaleText("<!-- Instructions -->"), "");
  assert.equal(
    rationaleText("before<!-- Instructions -->after"),
    "before after",
  );
  assert.equal(rationaleText("<!<!-- Instructions -->--"), "<! --");
});

for (const section of [
  "<!-- unclosed",
  "<!-- outer <!-- inner --> rest -->",
  "<!<!-- inner -->-->",
]) {
  test(`exemption rejects malformed or nested comment: ${section}`, async () => {
    await assert.rejects(
      enforce(apiFixture({ body: `## Test exemption rationale\n${section}` })),
    );
  });
}

test("exemption accepts real rationale alongside template comments without echoing it", async () => {
  const fixture = apiFixture({
    body: "## Test exemption rationale\n<!-- Instructions -->\nExisting tests cover <example>.",
  });
  const notices = [];
  fixture.core.notice = (message) => notices.push(message);
  await enforce(fixture);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].includes("<example>"), false);
});

test("diff hunks handle additions, replacements, and deletion-only hunks", () => {
  assert.deepEqual(
    [...addedLines("@@ -0,0 +1,2 @@\n@@ -8 +10 @@\n@@ -20,2 +22,0 @@")],
    [1, 2, 10],
  );
});
test("coverage checks only changed executable lines and fails missing files", () => {
  const coverage = parseLcov(
    "SF:src/model/a.ts\nDA:2,1\nDA:4,0\nend_of_record",
  ).get("src/model/a.ts");
  assert.equal(evaluateCoverage(new Set([1, 2]), coverage).percent, 100);
  assert.equal(evaluateCoverage(new Set([2, 4]), coverage).passes, false);
  assert.throws(() => evaluateCoverage(new Set([2]), undefined), /missing/);
});
test("90 percent boundary is inclusive and type-only files have no executable lines", () => {
  const lines = new Map(
    Array.from({ length: 10 }, (_, i) => [i, i === 0 ? 0 : 1]),
  );
  assert.equal(evaluateCoverage(new Set(lines.keys()), lines).passes, true);
  assert.equal(evaluateCoverage(new Set([1]), new Map()).total, 0);
});
test("application changes require actual test additions; docs and deleted tests do not qualify", () => {
  assert.equal(
    checkTestChanges([{ filename: "README.md", additions: 1 }]).required,
    false,
  );
  assert.deepEqual(
    checkTestChanges([
      { filename: "src/model/a.ts", additions: 1 },
      { filename: "src/model/a.test.ts", additions: 0 },
    ]),
    { required: true, satisfied: false },
  );
  assert.equal(
    checkTestChanges([
      { filename: "src/model/a.ts", additions: 1 },
      { filename: "src/model/a.test.ts", additions: 1 },
    ]).satisfied,
    true,
  );
  assert.equal(
    checkTestChanges([{ filename: "src/style.css", additions: 1 }]).required,
    true,
  );
});
test("dismissal and requested changes supersede approval, comments do not", () => {
  const user = { login: "reviewer" };
  assert.equal(
    latestReviews([
      { id: 1, user, state: "APPROVED" },
      { id: 2, user, state: "COMMENTED" },
    ])[0].state,
    "APPROVED",
  );
  assert.equal(
    latestReviews([
      { id: 1, user, state: "APPROVED" },
      { id: 2, user, state: "DISMISSED" },
    ])[0].state,
    "DISMISSED",
  );
});

function apiFixture({
  label = true,
  body = "## Test exemption rationale\nExisting cases exercise this rename.",
  state = "APPROVED",
  commit = "current",
  permission = "write",
  reviewer = "reviewer",
} = {}) {
  const pr = {
    labels: label ? [{ name: "tests-exempt" }] : [],
    body,
    head: { sha: "current" },
    user: { login: "author" },
  };
  const listFiles = () => {};
  const listReviews = () => {};
  return {
    context: {
      repo: { owner: "owner", repo: "repo" },
      payload: { pull_request: { number: 1 } },
    },
    core: { info() {}, notice() {} },
    github: {
      rest: {
        pulls: { get: async () => ({ data: pr }), listFiles, listReviews },
        repos: {
          getCollaboratorPermissionLevel: async () => ({
            data: { permission },
          }),
        },
      },
      paginate: async (method) =>
        method === listFiles
          ? [{ filename: "src/model/a.ts", additions: 1 }]
          : [{ id: 1, user: { login: reviewer }, state, commit_id: commit }],
    },
  };
}
test("exemption accepts a current approval by another writer", async () => {
  await enforce(apiFixture());
});
for (const [name, options] of Object.entries({
  "missing label": { label: false },
  "template-only rationale": {
    body: "## Test exemption rationale\n<!-- Explain here -->",
  },
  "stale approval": { commit: "previous" },
  "dismissed approval": { state: "DISMISSED" },
  "read-only reviewer": { permission: "read" },
  "self approval": { reviewer: "author" },
})) {
  test(`exemption rejects ${name}`, async () => {
    await assert.rejects(enforce(apiFixture(options)));
  });
}

test("changed coverage CLI fails uncovered committed changes against a real merge base", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } =
    await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { execFileSync, spawnSync } = await import("node:child_process");
  const { default: process } = await import("node:process");
  const dir = mkdtempSync(join(tmpdir(), "team3-coverage-test-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  try {
    git("init", "-q");
    git("config", "user.email", "ci-test@example.invalid");
    git("config", "user.name", "CI test");
    git("config", "commit.gpgsign", "false");
    mkdirSync(join(dir, "src/model"), { recursive: true });
    mkdirSync(join(dir, "coverage"));
    writeFileSync(join(dir, "src/model/logic.ts"), "export const value = 1;\n");
    git("add", ".");
    git("commit", "-qm", "baseline");
    const base = git("rev-parse", "HEAD");
    writeFileSync(join(dir, "src/model/logic.ts"), "export const value = 2;\n");
    git("add", ".");
    git("commit", "-qm", "change");
    const run = () =>
      spawnSync(
        process.execPath,
        [resolve("scripts/ci/changed-coverage.mjs"), base],
        { cwd: dir, encoding: "utf8" },
      );
    writeFileSync(
      join(dir, "coverage/lcov.info"),
      "SF:src/model/logic.ts\nDA:1,0\nend_of_record\n",
    );
    assert.equal(run().status, 1);
    writeFileSync(
      join(dir, "coverage/lcov.info"),
      "SF:src/model/logic.ts\nDA:1,2\nend_of_record\n",
    );
    assert.equal(run().status, 0);
    writeFileSync(join(dir, "coverage/lcov.info"), "");
    assert.equal(run().status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
