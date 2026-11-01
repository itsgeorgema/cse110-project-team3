export function checkTestChanges(files) {
  const source = files.filter(
    ({ filename }) =>
      (filename.startsWith("src/") &&
        !filename.endsWith(".md") &&
        !/\.(test|spec)\.ts$/.test(filename)) ||
      filename === "index.html",
  );
  // Removing or merely renaming a test is not evidence of new coverage.
  const tests = files.filter(
    ({ filename, additions }) =>
      additions > 0 &&
      (/^src\/.*\.test\.ts$/.test(filename) ||
        /^tests\/(contracts|e2e)\/.*\.ts$/.test(filename)),
  );
  return { required: source.length > 0, satisfied: tests.length > 0 };
}

export function latestReviews(reviews) {
  const latest = new Map();
  for (const review of [...reviews].sort((a, b) => a.id - b.id)) {
    // A comment-only review does not replace an approval or request for changes.
    if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) {
      latest.set(review.user.login, review);
    }
  }
  return [...latest.values()];
}

export async function enforce({ github, context, core }) {
  const { owner, repo } = context.repo;
  const pull_number = context.payload.pull_request.number;
  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number,
    per_page: 100,
  });
  if (files.length >= 3000)
    throw new Error(
      "PR exceeds GitHub file-list limit; split it for reliable test review.",
    );
  const result = checkTestChanges(files);
  if (!result.required || result.satisfied) {
    core.info(
      result.required
        ? "Application and test changes are both present; reviewers must assess relevance."
        : "No application changes require accompanying tests.",
    );
    return;
  }
  if (!pr.labels.some(({ name }) => name === "tests-exempt")) {
    throw new Error(
      'Application changes require test additions/updates. For an already-tested refactor or nonbehavioral change, explain it under "Test exemption rationale" and request a reviewer-approved tests-exempt label.',
    );
  }
  const rationale = (pr.body ?? "")
    .match(/## Test exemption rationale\s*\n([\s\S]*?)(?=\n## |$)/i)?.[1]
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  if (!rationale || /^(?:n\/?a|none|not applicable)[.!]?$/i.test(rationale)) {
    throw new Error(
      'Add a concrete explanation under "## Test exemption rationale".',
    );
  }
  const reviews = latestReviews(
    await github.paginate(github.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number,
      per_page: 100,
    }),
  );
  for (const review of reviews) {
    if (
      review.state !== "APPROVED" ||
      review.commit_id !== pr.head.sha ||
      review.user.login === pr.user.login
    )
      continue;
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: review.user.login,
    });
    if (
      ["write", "maintain", "admin"].includes(data.permission) ||
      data.user?.permissions?.push
    ) {
      core.notice(
        `Test-change exemption approved at the current head by ${review.user.login}: ${rationale}`,
      );
      return;
    }
  }
  throw new Error(
    "tests-exempt requires approval of the current commit by another collaborator with write access. New commits require renewed approval.",
  );
}
