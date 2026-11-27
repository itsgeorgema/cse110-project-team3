import { test, expect } from "./fixtures.ts";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
});

for (const width of [1280, 390]) {
  test.describe(`overworld routing at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, reducedMotion: "reduce" });

    test("@smoke rejects jumps and routes through neighboring levels", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        if (!localStorage.getItem("escape-route-progress")) {
          localStorage.setItem(
            "escape-route-progress",
            JSON.stringify({
              schemaVersion: 1,
              completedLevels: [1, 2].map((levelId) => ({
                gameId: "kinematics",
                levelId,
              })),
              currentLevel: { gameId: "kinematics", levelId: 1 },
            }),
          );
        }
      });
      await page.goto("./");
      const first = page.getByRole("button", {
        name: /Level 1: The getaway car/,
      });
      const second = page.getByRole("button", {
        name: /Level 2: Past the big top/,
      });
      const third = page.getByRole("button", {
        name: /Level 3: Outrun the ringmaster/,
      });
      const savedBefore = await page.evaluate(() =>
        localStorage.getItem("escape-route-progress"),
      );
      await expect(third).toHaveAttribute("aria-disabled", "true");
      await third.focus();
      await third.press("Enter");
      await expect(page.locator(".navigation-status")).toContainText(
        "one neighboring location at a time",
      );
      await expect(first).toHaveAttribute("aria-pressed", "true");
      expect(
        await page.evaluate(() =>
          localStorage.getItem("escape-route-progress"),
        ),
      ).toBe(savedBefore);
      await second.click();
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.locator('[data-node="backstage"] .clown'),
      ).toBeVisible();
      await expect(page.locator(".clown")).toHaveCount(1);
      await expect(third).toHaveAttribute("aria-disabled", "false");
      await page
        .getByRole("button", { name: "Replay level", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Past the big top" });
      await expect(
        dialog.getByLabel("displacement (m)", { exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await third.click();
      await expect(third).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(third).toHaveAttribute("aria-pressed", "true");
      await page
        .getByRole("button", { name: "Start level", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByLabel("acceleration (m/s^2)", { exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      // Return along the same undirected edges; progression is unchanged.
      await second.click();
      await first.click();
      await expect(first).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
      await page.getByRole("button", { name: "Reset progress" }).click();
      await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
      await expect(second).toHaveAttribute("aria-disabled", "true");
      await expect(first).toHaveAttribute("aria-pressed", "true");
    });
  });
}

test("a locked saved position falls back to an available level", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "escape-route-progress",
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [],
        currentLevel: { gameId: "netForce", levelId: 2 },
      }),
    );
  });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: /Level 1: The getaway car/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: /Level 6: The blocked gate/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Start level", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "The getaway car" }),
  ).toBeVisible();
});
