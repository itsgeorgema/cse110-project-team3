import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";

async function expectStage(page: Page) {
  const stage = page.locator("#app .konvajs-content");
  await expect(stage).toHaveCount(1);
  await expect(stage).toBeVisible();
  const canvas = stage.locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
  const viewport = page.viewportSize()!;
  await expect(stage).toHaveCSS("width", `${viewport.width}px`);
  await expect(stage).toHaveCSS("height", `${viewport.height}px`);
  // A visible canvas with zero backing pixels cannot render the game.
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => element.width),
  ).toBeGreaterThan(0);
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => element.height),
  ).toBeGreaterThan(0);
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("@smoke production entry loads one full-viewport Konva stage", async ({
      page,
    }) => {
      const response = await page.goto("./");
      expect(response?.status()).toBe(200);
      await expectStage(page);
      // Verify built assets actually use the repository subpath, not dev sources.
      const script = page.locator('script[type="module"][src]');
      await expect(script).toHaveAttribute(
        "src",
        /^\/cse110-project-team3\/assets\/.+\.js$/,
      );
    });
  });
}

test("refresh rebuilds a single stage without duplicate canvases", async ({
  page,
}) => {
  await page.goto("./");
  await expectStage(page);
  await page.reload();
  await expectStage(page);
});
