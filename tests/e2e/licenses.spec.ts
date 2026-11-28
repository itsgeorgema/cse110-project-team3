import { test, expect } from "./fixtures.ts";

// License notices page for the game's open source software (#35).
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("./");
});

test("@smoke lists the open source licenses from the top bar", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Licenses" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Licenses" });
  await expect(dialog).toBeVisible();
  for (const name of [
    "Escape Route",
    "konva",
    "matter-js",
    "DM Sans",
    "Libre Caslon Display",
  ]) {
    await expect(dialog.getByRole("link", { name, exact: true })).toBeVisible();
  }

  const konva = dialog.getByRole("listitem").filter({ hasText: "konva" });
  await konva.getByText("MIT license text").click();
  await expect(konva.locator("pre")).toContainText("Anton Lavrenov");
  await expect(konva.locator("pre")).toContainText(
    "Permission is hereby granted",
  );

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("closes the licenses with Escape", async ({ page }) => {
  await page.getByRole("button", { name: "Licenses" }).click();
  const dialog = page.getByRole("dialog", { name: "Licenses" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
