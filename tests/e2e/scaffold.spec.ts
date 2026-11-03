import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
});

async function expectMap(
  page: Page,
  expectedCurrent = 3,
  expectedCleared = 2,
  expectComingSoon = true,
) {
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
    page.getByRole("button", { name: new RegExp(`Level ${expectedCurrent}:`) }),
  ).toHaveAttribute("aria-pressed", "true");
  if (expectComingSoon) {
    await expect(
      page.getByRole("button", { name: "Level coming soon" }),
    ).toBeDisabled();
  }
  await expect(page.getByText("Saved progress", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "value",
    String(expectedCleared),
  );
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
      await page.addInitScript(() => {
        localStorage.setItem(
          "escape-route-progress",
          JSON.stringify({
            schemaVersion: 1,
            completedLevels: [
              { gameId: "circus-preview", levelId: 1 },
              { gameId: "circus-preview", levelId: 2 },
            ],
          }),
        );
      });
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

test("refresh restores the selected level", async ({ page }) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: /Level 2: Backstage breakout/ })
    .click();
  await page.reload();
  await expectMap(page, 2, 2, false);
});

test("saved completions restore the map state and journey count", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [{ gameId: "circus-preview", levelId: 1 }],
      }),
    );
  });
  await page.goto("./");
  await expectMap(page, 2, 1);
  await expect(
    page.getByRole("button", { name: /Level 1: The dressing room/ }),
  ).toHaveClass(/cleared/);
  await expect(page.locator(".map-node.current .node-circle")).toHaveText("02");
});

test("selected level restores after refresh and reset clears saved progress", async ({
  page,
}) => {
  await page.goto("./");
  const selected = page.getByRole("button", {
    name: /Level 3: Under the big top/,
  });
  await selected.click();
  await page.reload();
  const restored = page.getByRole("button", {
    name: /Level 3: Under the big top/,
  });
  await expect(restored).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Under the big top" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset progress" }).click();
  await expectMap(page, 1, 0);
  expect(
    await page.evaluate(() => localStorage.getItem("escape-route-progress")),
  ).toBeNull();
});
