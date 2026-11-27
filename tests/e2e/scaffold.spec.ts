import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
});

async function expectMap(
  page: Page,
  expectedCurrent = 1,
  expectedCleared = 0,
  expectPlayable = true,
) {
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "The Great Escape" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Scrollable story map" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Level \d+:/ })).toHaveCount(
    13,
  );
  await expect(
    page.getByRole("button", { name: new RegExp(`Level ${expectedCurrent}:`) }),
  ).toHaveAttribute("aria-pressed", "true");
  if (expectPlayable) {
    await expect(
      page.getByRole("button", { name: "Start level" }),
    ).toBeEnabled();
  }
  await expect(page.getByText("Saved progress", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "value",
    String(expectedCleared),
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute("max", "13");
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

    test("locked destinations refuse navigation and keep the current selection", async ({
      page,
    }) => {
      await page.goto("./");
      const locked = page.getByRole("button", {
        name: /Level 6: The blocked gate/,
      });
      // aria-disabled communicates refusal while allowing an explanatory message.
      await locked.dispatchEvent("click");
      await expect(locked).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator(".navigation-status")).toContainText(
        "Complete the earlier levels",
      );
      await expectMap(page);
      await page.getByRole("button", { name: /Back to your chapter/ }).click();
      await expectMap(page);
    });

    test("completed levels replay the real problem and return focus", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "escape-route-progress",
          JSON.stringify({
            schemaVersion: 1,
            completedLevels: [{ gameId: "kinematics", levelId: 1 }],
          }),
        );
      });
      await page.goto("./");
      await page
        .getByRole("button", { name: /Level 1: The getaway car/ })
        .click();
      const trigger = page.getByRole("button", {
        name: "Replay level",
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", {
        name: "The getaway car",
      });
      await expect(
        dialog.getByLabel("velocity (m/s)", { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Mock results", { exact: false }),
      ).toHaveCount(0);
      await dialog.getByRole("button", { name: "Return to story map" }).click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });
  });
}

test("refresh restores an accepted neighboring destination", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("escape-route-progress"))
      localStorage.setItem(
        "escape-route-progress",
        JSON.stringify({
          schemaVersion: 1,
          completedLevels: [{ gameId: "kinematics", levelId: 1 }],
        }),
      );
  });
  await page.goto("./");
  await page.getByRole("button", { name: /Level 1: The getaway car/ }).click();
  await page.reload();
  await expectMap(page, 1, 1, false);
});

test("saved completions restore the map state and journey count", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [{ gameId: "kinematics", levelId: 1 }],
      }),
    );
  });
  await page.goto("./");
  await expectMap(page, 2, 1);
  await expect(
    page.getByRole("button", { name: /Level 1: The getaway car/ }),
  ).toHaveClass(/cleared/);
  await expect(page.locator(".map-node.current .node-circle")).toHaveText("02");
});

test("selected level restores after refresh and reset clears saved progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("escape-route-progress"))
      localStorage.setItem(
        "escape-route-progress",
        JSON.stringify({
          schemaVersion: 1,
          completedLevels: [1, 2].map((levelId) => ({
            gameId: "kinematics",
            levelId,
          })),
          currentLevel: { gameId: "kinematics", levelId: 2 },
        }),
      );
  });
  await page.goto("./");
  const selected = page.getByRole("button", {
    name: /Level 3: Outrun the ringmaster/,
  });
  await selected.click();
  await page.reload();
  const restored = page.getByRole("button", {
    name: /Level 3: Outrun the ringmaster/,
  });
  await expect(restored).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Outrun the ringmaster" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset progress" }).click();
  await expectMap(page, 1, 0);
  expect(
    await page.evaluate(() => localStorage.getItem("escape-route-progress")),
  ).toBeNull();
});
