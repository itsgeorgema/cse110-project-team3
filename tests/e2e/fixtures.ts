import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ browserHealth: void }>({
  browserHealth: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        errors.push(
          `${request.method()} ${request.url()}: ${request.failure()?.errorText}`,
        );
      });
      page.on("response", (response) => {
        if (response.status() >= 400) {
          errors.push(`${response.status()} ${response.url()}`);
        }
      });
      await use();
      expect(errors, "No browser errors or failed asset requests").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
