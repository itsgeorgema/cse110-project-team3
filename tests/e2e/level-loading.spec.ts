import { test, expect } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
});

for (const width of [1280, 390]) {
  test.describe(`level loading at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test("@smoke loads a real problem and allows an answer to be corrected", async ({
      page,
    }) => {
      await page.goto("./");
      await page
        .getByRole("button", { name: "Start level", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Getaway vehicle: velocity",
      });
      await expect(dialog.locator(".level-problem")).toContainText("10 meters");
      const answer = dialog.getByLabel("velocity (m/s)", { exact: true });
      await expect(answer).toBeFocused();
      await answer.fill("letters");
      await answer.press("Enter");
      await expect(answer).toHaveAttribute("aria-invalid", "true");
      await expect(
        dialog.getByText("Use digits, like 9.8 or 3e8."),
      ).toBeVisible();
      await answer.fill("1");
      await answer.press("Enter");
      await expect(dialog.getByRole("status")).toHaveText(
        "Not quite. Check your answers and try again.",
      );
      await expect(answer).toHaveAttribute("aria-invalid", "false");
      await answer.fill("5");
      await answer.press("Enter");
      await expect(dialog.getByRole("status")).toHaveText("Correct!");
      await dialog
        .getByRole("button", { name: "Return to story map", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Start level", exact: true }),
      ).toBeFocused();
      await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
    });
  });
}

test("switching map levels replaces fields and feedback; Escape clears the session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [1, 2, 3].map((levelId) => ({
          gameId: "kinematics",
          levelId,
        })),
        currentLevel: { gameId: "kinematics", levelId: 1 },
      }),
    );
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Replay level", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("velocity (m/s)", { exact: true }).fill("5");
  await dialog.getByRole("button", { name: "Check answer" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Correct!");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Level 4: Midnight midway/ }).click();
  await page.getByRole("button", { name: "Start level", exact: true }).click();
  await expect(
    dialog.getByLabel("velocity (m/s)", { exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("status")).toBeEmpty();
  await expect(dialog.getByRole("textbox")).toHaveCount(3);
  await dialog
    .getByLabel("gravitationalForce (N)", { exact: true })
    .fill("49.05");
  await dialog.getByLabel("normalForce (N)", { exact: true }).fill("49.05");
  await dialog.getByLabel("netForce (N)", { exact: true }).fill("0");
  await dialog.getByRole("button", { name: "Check answer" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Correct!");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Start level", exact: true }).click();
  await expect(dialog.getByLabel("netForce (N)", { exact: true })).toHaveValue(
    "",
  );
  await expect(dialog.getByRole("status")).toBeEmpty();
});

test("a generation failure shows recovery controls without answer fields", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    Math.random = () => NaN;
  });
  await page.getByRole("button", { name: "Start level", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText(
    "This problem could not be loaded",
  );
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(
    dialog.getByLabel("velocity (m/s)", { exact: true }),
  ).toBeVisible();
});

test("preview saves never grant completion of real levels and locked levels cannot open", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [1, 2].map((levelId) => ({
          gameId: "circus-preview",
          levelId,
        })),
      }),
    );
  });
  await page.goto("./?game=netForce&level=2");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Practice levels", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Level 4: Midnight midway/ }).click();
  await expect(
    page.getByRole("button", { name: "Chapter locked", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Start level", exact: true }),
  ).toHaveCount(0);
});

test("a config rejected by the format check never renders and can be retried", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    const clone = window.structuredClone;
    let corruptNextConfig = true;
    window.structuredClone = (value, options) => {
      const result = clone(value, options);
      if (
        corruptNextConfig &&
        typeof result === "object" &&
        result !== null &&
        "gameId" in result &&
        result.gameId === "kinematics" &&
        "userInputVariables" in result
      ) {
        corruptNextConfig = false;
        result.userInputVariables = [];
      }
      return result;
    };
  });
  await page.getByRole("button", { name: "Start level", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText(
    "problem with its setup",
  );
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(
    dialog.getByLabel("velocity (m/s)", { exact: true }),
  ).toBeVisible();
});

test("an unlocked location without a registered config stays unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [
          ...[1, 2, 3].map((levelId) => ({ gameId: "kinematics", levelId })),
          { gameId: "netForce", levelId: 2 },
        ],
      }),
    );
  });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Level coming soon" }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
