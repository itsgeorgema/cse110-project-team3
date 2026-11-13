import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function addedLines(diff) {
  const lines = new Set();
  for (const match of diff.matchAll(
    /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm,
  )) {
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    for (let line = start; line < start + count; line++) lines.add(line);
  }
  return lines;
}

export function parseLcov(text, root = process.cwd()) {
  const files = new Map();
  let lines;
  for (const record of text.split(/\r?\n/)) {
    if (record.startsWith("SF:")) {
      const file = record.slice(3);
      const relative = path.isAbsolute(file) ? path.relative(root, file) : file;
      lines = new Map();
      files.set(relative.replaceAll("\\", "/"), lines);
    } else if (record.startsWith("DA:") && lines) {
      const [line, hits] = record.slice(3).split(",").map(Number);
      lines.set(line, Math.max(lines.get(line) ?? 0, hits));
    } else if (record === "end_of_record") {
      lines = undefined;
    }
  }
  return files;
}

export function evaluateCoverage(changed, coveredLines, threshold = 90) {
  if (!coveredLines)
    throw new Error("Changed source file is missing from LCOV.");
  const executable = [...changed].filter((line) => coveredLines.has(line));
  const missed = executable.filter((line) => coveredLines.get(line) === 0);
  const percent = executable.length
    ? (100 * (executable.length - missed.length)) / executable.length
    : 100;
  return {
    total: executable.length,
    missed,
    percent,
    passes: percent >= threshold,
  };
}

export function main() {
  const base = process.argv[2];
  if (!base || !/^[a-f0-9]{40,64}$/i.test(base))
    throw new Error(
      "Pass the base commit SHA: npm run test:coverage:changed -- <sha>",
    );
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
  const range = `${base}...HEAD`;
  const files = git(
    "diff",
    "--name-only",
    "-z",
    "--diff-filter=ACMR",
    range,
    "--",
    "src/controller",
    "src/model",
    "src/data",
  )
    .split("\0")
    .filter((file) => file.endsWith(".ts") && !/\.(test|d)\.ts$/.test(file));
  const coverage = parseLcov(readFileSync("coverage/lcov.info", "utf8"));
  let failed = false;
  for (const file of files) {
    const diff = git(
      "diff",
      "--no-ext-diff",
      "--no-color",
      "--unified=0",
      range,
      "--",
      file,
    );
    const changed = addedLines(diff);
    if (!changed.size) continue;
    const result = evaluateCoverage(changed, coverage.get(file));
    process.stdout.write(
      `${file}: ${result.percent.toFixed(1)}% of ${result.total} changed executable lines covered; uncovered lines: ${result.missed.join(", ") || "none"}\n`,
    );
    failed ||= !result.passes;
  }
  if (!files.length)
    process.stdout.write("No changed model/controller/data source files.\n");
  if (failed)
    throw new Error(
      "Changed-line coverage must be at least 90% in each changed logic file.",
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
