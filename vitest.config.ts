import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Browser journeys have their own runner; an empty unit suite must fail.
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      // Include future logic even before its author adds a test.
      // DOM/canvas composition is exercised separately by browser tests.
      include: [
        "src/controller/**/*.ts",
        "src/model/**/*.ts",
        "src/data/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.d.ts"],
      reporter: ["text", "html", "lcov", "json-summary"],
      reportOnFailure: true,
      thresholds: {
        perFile: true,
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
