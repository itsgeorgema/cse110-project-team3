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
        name: "The getaway car",
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
      // The run must finish before the level counts, so the way back waits.
      await expect(
        dialog.getByRole("button", { name: "Finishing your run…" }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", { name: "Return to story map", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Replay level", exact: true }),
      ).toBeFocused();
      await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
    });
  });
}

test("@smoke plays the getaway car on the stage and records the attempt after playback (#116)", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start level", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "The getaway car" });
  const stage = dialog.getByRole("img", { name: "Animation of your answer" });
  await expect(stage.locator("canvas")).toBeVisible();
  const box = await stage.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);

  await dialog.getByLabel("velocity (m/s)", { exact: true }).fill("5");
  await dialog.getByRole("button", { name: "Check answer" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Correct!");

  // The run lasts the level's 2 s; the attempt is saved only once it ends.
  const savedAttempts = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("escape-route-progress") ?? "{}")
          .attempts?.length ?? 0,
    );
  expect(await savedAttempts()).toBe(0);
  await expect.poll(savedAttempts, { timeout: 5_000 }).toBe(1);
});

test("@smoke clearing a level unlocks the next node as soon as the map is back", async ({
  page,
}) => {
  await page.goto("./");
  const nextLevel = page.locator('[data-node="backstage"]');
  await expect(nextLevel).toHaveClass(/locked/);

  await page.getByRole("button", { name: "Start level", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "The getaway car" });
  await dialog.getByLabel("velocity (m/s)", { exact: true }).fill("5");
  await dialog.getByRole("button", { name: "Check answer" }).click();
  // The level clears once its 2 s run has played.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("escape-route-progress") ?? "{}")
              .completedLevels?.length ?? 0,
        ),
      { timeout: 5_000 },
    )
    .toBe(1);
  await dialog
    .getByRole("button", { name: "Return to story map", exact: true })
    .click();

  await expect(nextLevel).not.toHaveClass(/locked/);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await expect(
    page.getByRole("button", { name: "Replay level", exact: true }),
  ).toBeFocused();
});

test("switching map levels replaces fields and feedback; Escape clears the session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [
<<<<<<< HEAD
          ...[1, 2, 3, 4].map((levelId) => ({ gameId: "kinematics", levelId })),
=======
          ...[1, 2, 3].map((levelId) => ({ gameId: "kinematics", levelId })),
>>>>>>> origin/main
          { gameId: "netForce", levelId: 1 },
        ],
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
  await expect(
    dialog.getByRole("button", { name: "Return to story map", exact: true }),
  ).toBeEnabled({ timeout: 5_000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Level 2: Past the big top/ }).click();
  await page
    .getByRole("button", { name: /Level 3: Outrun the ringmaster/ })
    .click();
<<<<<<< HEAD
  await page.getByRole("button", { name: /Level 5: Push the crate/ }).click();
  await page.getByRole("button", { name: /Level 6: The blocked gate/ }).click();
=======
  await page.getByRole("button", { name: /Level 4: Push the crate/ }).click();
  await page.getByRole("button", { name: /Level 5: The blocked gate/ }).click();
>>>>>>> origin/main
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
  // The resting crate now plays its run (#141); the attempt counts when it ends.
  await expect(
    dialog.getByRole("button", { name: "Return to story map", exact: true }),
  ).toBeEnabled({ timeout: 5_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  // The cleared level is redrawn as cleared at once (#106).
  await page.getByRole("button", { name: "Replay level", exact: true }).click();
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
  await page
<<<<<<< HEAD
    .getByRole("button", { name: /Level 6: The blocked gate/ })
=======
    .getByRole("button", { name: /Level 5: The blocked gate/ })
>>>>>>> origin/main
    .dispatchEvent("click");
  await expect(page.locator(".navigation-status")).toContainText(
    "Complete the earlier levels",
  );
  await expect(
    page.getByRole("button", { name: /Level 1: The getaway car/ }),
  ).toHaveAttribute("aria-pressed", "true");
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
<<<<<<< HEAD
          ...[1, 2, 3, 4].map((levelId) => ({ gameId: "kinematics", levelId })),
=======
          ...[1, 2, 3].map((levelId) => ({ gameId: "kinematics", levelId })),
>>>>>>> origin/main
          { gameId: "netForce", levelId: 1 },
          { gameId: "netForce", levelId: 2 },
          { gameId: "cannonTrajectory", levelId: 1 },
          { gameId: "cannonTrajectory", levelId: 2 },
          { gameId: "cannonTrajectory", levelId: 3 },
          { gameId: "circularMotion", levelId: 1 },
          { gameId: "circularMotion", levelId: 2 },
          { gameId: "circularMotion", levelId: 3 },
        ],
      }),
    );
  });
  await page.goto("./");
  await page
<<<<<<< HEAD
    .getByRole("button", { name: /Level 13: The final swing/ })
=======
    .getByRole("button", { name: /Level 12: The final swing/ })
>>>>>>> origin/main
    .dispatchEvent("click");
  await expect(page.locator(".navigation-status")).toHaveText(
    "This level is coming soon.",
  );
  await expect(
<<<<<<< HEAD
    page.getByRole("button", { name: /Level 12: Over the top/ }),
=======
    page.getByRole("button", { name: /Level 11: Over the top/ }),
>>>>>>> origin/main
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
