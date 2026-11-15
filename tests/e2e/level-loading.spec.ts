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
  test.describe(`practice levels at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test("@smoke loads a real problem and allows an answer to be corrected", async ({
      page,
    }) => {
      await page.goto("./");
      await page
        .getByRole("button", { name: "Practice levels", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Practice a physics problem",
      });
      await dialog
        .getByRole("button", { name: "Load level", exact: true })
        .click();
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
        page.getByRole("button", { name: "Practice levels", exact: true }),
      ).toBeFocused();
      await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
    });
  });
}

test("switching levels replaces fields and feedback; Escape clears the session", async ({
  page,
}) => {
  await page.goto("./?game=kinematics&level=1");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("velocity (m/s)", { exact: true }).fill("5");
  await dialog.getByRole("button", { name: "Check answer" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Correct!");
  await dialog
    .getByLabel("Choose a level")
    .selectOption({ label: "Blocked gate: balanced forces" });
  await dialog.getByRole("button", { name: "Load level", exact: true }).click();
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
  await page
    .getByRole("button", { name: "Practice levels", exact: true })
    .click();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(dialog.getByRole("status")).toBeEmpty();
});

test("unknown level links show recovery controls and never render answer fields", async ({
  page,
}) => {
  await page.goto("./?game=missing&level=99");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText(
    "This level is not available",
  );
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Load level", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(
    dialog.getByLabel("velocity (m/s)", { exact: true }),
  ).toBeVisible();
});
