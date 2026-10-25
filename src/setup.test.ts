import { describe, expect, it } from "vitest";

// Placeholder so CI has a test to run until real tests land with #23 and #25.
describe("test setup", () => {
  it("runs TypeScript tests", () => {
    const sum: number = 1 + 1;
    expect(sum).toBe(2);
  });
});
