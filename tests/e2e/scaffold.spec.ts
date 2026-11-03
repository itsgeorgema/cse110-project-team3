import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";

// Test the documented font fallback without depending on Google's availability.
// All application assets still load normally and remain subject to health checks.
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
});

async function expectMap(page: Page) {
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "The Great Escape" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Scrollable story map" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Level \d+:/ })).toHaveCount(
    7,
  );
  await expect(
    page.getByRole("button", { name: /Level 3: Under the big top/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Level coming soon" }),
  ).toBeDisabled();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  await expect(page.getByRole("progressbar")).toHaveAttribute("max", "7");
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("@smoke production entry loads the overworld story map", async ({
      page,
    }) => {
      const response = await page.goto("./");
      expect(response?.status()).toBe(200);
      await expectMap(page);
      await expect(page.locator('script[type="module"][src]')).toHaveAttribute(
        "src",
        /^\/cse110-project-team3\/assets\/.+\.js$/,
      );
    });

    test("locked story can be previewed but not played; return restores current selection", async ({
      page,
    }) => {
      await page.goto("./");
      const locked = page.getByRole("button", {
        name: /Level 4: Midnight midway/,
      });
      await locked.click();
      await expect(locked).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("heading", { name: "Midnight midway" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Chapter locked" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", { name: /View results/ }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: /Back to your chapter/ }).click();
      await expectMap(page);
      await expect(locked).toHaveAttribute("aria-pressed", "false");
    });

    test("completed level results close by button or Escape and restore focus", async ({
      page,
    }) => {
      await page.goto("./");
      await page
        .getByRole("button", { name: /Level 1: The dressing room/ })
        .click();
      const trigger = page.getByRole("button", { name: /View results/ });
      const map = page.getByRole("region", { name: "Scrollable story map" });
      const scrollTop = await map.evaluate((element) => element.scrollTop);
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Results Summary" });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "The dressing room" }),
      ).toBeVisible();
      await expect(dialog.locator(".accuracy-display")).toHaveText("90%");
      await expect(dialog.getByText("9 / 10", { exact: true })).toBeVisible();
      await expect(
        dialog.getByText("Mock results for this preview.", { exact: false }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: /Return to story map/ }).click();
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await map.evaluate((element) => element.scrollTop)).toBe(
        scrollTop,
      );
      await trigger.click();
      await expect(dialog).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  });
}

test("refresh rebuilds one map with the initial sample selection", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: /Level 2: Backstage breakout/ })
    .click();
  await page.reload();
  await expectMap(page);
});
