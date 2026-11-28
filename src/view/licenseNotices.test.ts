import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import repositoryLicense from "../../LICENSE?raw";
import { gameNotice, thirdPartyNotices } from "./licenseNotices.ts";

describe("license notices (#35)", () => {
  it("shows the repository's own license for the game", () => {
    expect(gameNotice.license).toBe(packageJson.license);
    expect(gameNotice.text).toBe(repositoryLicense);
  });

  it("has a notice with the full license text for every runtime dependency", async () => {
    const names = Object.keys(packageJson.dependencies);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const notice = thirdPartyNotices.find((entry) => entry.name === name);
      expect(notice, `${name} needs a license notice`).toBeDefined();
      const installed = (await import(
        `../../node_modules/${name}/package.json`
      )) as { license: string };
      expect(notice!.license).toBe(installed.license);
      // MIT requires shipping the copyright and permission notice.
      expect(notice!.text).toMatch(/Copyright/);
      expect(notice!.text).toMatch(/Permission is hereby granted/);
    }
  });

  it("gives every notice a project link and its license text or a link to it", () => {
    for (const notice of [gameNotice, ...thirdPartyNotices]) {
      expect(notice.url).toMatch(/^https:\/\//);
      expect(notice.text ?? notice.licenseUrl).toBeTruthy();
    }
  });
});
