import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";

// Save, reset, retrieve and quit (#3).
const STORAGE_KEY = "escape-route-progress";
const twoLevelsCleared = {
  schemaVersion: 2,
  completedLevels: [1, 2].map((levelId) => ({ gameId: "kinematics", levelId })),
  currentLevel: { gameId: "kinematics", levelId: 3 },
  attempts: [
    {
      gameId: "kinematics",
      levelId: 1,
      values: { velocity: 5 },
      correct: true,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
});

/** Seeds storage once, so a later reload keeps whatever the page wrote. */
async function startWith(page: Page, save: unknown) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [STORAGE_KEY, JSON.stringify(save)],
  );
  await page.goto("./");
  await expect(page.getByRole("progressbar")).toBeVisible();
}

const storedSave = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

test("@smoke downloads the saved progress as a JSON file", async ({ page }) => {
  await startWith(page, twoLevelsCleared);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download progress" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^escape-route-progress-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const contents = await readFile((await download.path())!, "utf8");
  expect(JSON.parse(contents)).toEqual(twoLevelsCleared);
  await expect(page.getByRole("status").first()).toHaveText(
    "Progress file downloaded.",
  );
});

test("importing a progress file restores it on this device", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");

  await Promise.all([
    page.waitForEvent("load"),
    page.getByLabel("Progress file to import").setInputFiles({
      name: "escape-route-progress.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(twoLevelsCleared)),
    }),
  ]);

  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  await expect(
    page.getByRole("button", { name: /Level 3: Outrun the ringmaster/ }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(JSON.parse((await storedSave(page))!)).toEqual(twoLevelsCleared);
});

test("an invalid file is rejected and progress is unchanged", async ({
  page,
}) => {
  await startWith(page, twoLevelsCleared);
  const before = await storedSave(page);

  await page.getByLabel("Progress file to import").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello": "world"}'),
  });

  await expect(
    page.getByText(
      "That file isn't an Escape Route progress file. Your progress is unchanged.",
    ),
  ).toBeVisible();
  expect(await storedSave(page)).toBe(before);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
});

test("closing the tab warns until the player quits", async ({ page }) => {
  await startWith(page, twoLevelsCleared);
  // Browsers only warn after the player has interacted with the page.
  await page
    .getByRole("button", { name: /Level 3: Outrun the ringmaster/ })
    .click();

  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => dialogs).toEqual(["beforeunload"]);
});

test("staying after the close warning points to the Quit button", async ({
  page,
}) => {
  await startWith(page, twoLevelsCleared);
  // Browsers only warn after the player has interacted with the page.
  await page.getByRole("button", { name: "Quit" }).click();
  await page.getByRole("button", { name: "Keep playing" }).click();

  page.on("dialog", (dialog) => void dialog.dismiss());
  await page.close({ runBeforeUnload: true });

  await expect(
    page.getByRole("status").filter({ hasText: "Quit button" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Quit" })).toHaveClass(
    /quit-game--highlight/,
  );
});

test("Keep playing closes the quit dialog and returns focus", async ({
  page,
}) => {
  await startWith(page, twoLevelsCleared);
  const quit = page.getByRole("button", { name: "Quit", exact: true });
  await quit.click();
  const dialog = page.getByRole("dialog", { name: "Quit the game?" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Keep playing" }).click();

  await expect(dialog).not.toBeVisible();
  await expect(quit).toBeFocused();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
});

test("Save and quit keeps progress and closes without a warning", async ({
  page,
}) => {
  await startWith(page, twoLevelsCleared);
  await page.getByRole("button", { name: "Quit", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Quit the game?" })
    .getByRole("button", { name: "Save and quit" })
    .click();

  await expect(
    page.getByText(
      "Your progress is saved in this browser. You can close this tab.",
    ),
  ).toBeVisible();
  expect(JSON.parse((await storedSave(page))!)).toEqual(twoLevelsCleared);

  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
});

test("Delete progress and quit clears the save", async ({ page }) => {
  await startWith(page, twoLevelsCleared);
  await page.getByRole("button", { name: "Quit", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Quit the game?" })
    .getByRole("button", { name: "Delete progress and quit" })
    .click();

  await expect(
    page.getByText("Your progress was deleted. You can close this tab."),
  ).toBeVisible();
  expect(await storedSave(page)).toBeNull();

  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
  expect(dialogs).toEqual([]);
});
