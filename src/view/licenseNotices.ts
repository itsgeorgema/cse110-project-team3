import gameLicense from "../../LICENSE?raw";
import konvaLicense from "../../node_modules/konva/LICENSE?raw";
import matterLicense from "../../node_modules/matter-js/LICENSE?raw";

/** One entry on the licenses page (#35). */
export interface LicenseNotice {
  readonly name: string;
  /** SPDX identifier, such as "MIT". */
  readonly license: string;
  readonly url: string;
  readonly use: string;
  /**
   * The full license text, copied from the package so the shipped game keeps
   * the copyright and permission notice its license requires. Omitted for
   * software we don't redistribute; `licenseUrl` points to the text instead.
   */
  readonly text?: string;
  readonly licenseUrl?: string;
}

/** Escape Route itself, under the repository's MIT license (#36). */
export const gameNotice: LicenseNotice = {
  name: "Escape Route",
  license: "MIT",
  url: "https://github.com/itsgeorgema/cse110-project-team3",
  use: "This game",
  text: gameLicense,
};

/**
 * Open source software the game uses. Bundled packages carry their full
 * license text. Keep this list in step with `dependencies` in package.json
 * and the table in docs/licensing.md; a unit test checks the packages.
 */
export const thirdPartyNotices: readonly LicenseNotice[] = [
  {
    name: "konva",
    license: "MIT",
    url: "https://github.com/konvajs/konva",
    use: "Canvas rendering",
    text: konvaLicense,
  },
  {
    name: "matter-js",
    license: "MIT",
    url: "https://github.com/liabru/matter-js",
    use: "2D physics",
    text: matterLicense,
  },
  {
    name: "DM Sans",
    license: "OFL-1.1",
    url: "https://fonts.google.com/specimen/DM+Sans",
    use: "Font, loaded from Google Fonts",
    licenseUrl: "https://openfontlicense.org/open-font-license-official-text/",
  },
  {
    name: "Libre Caslon Display",
    license: "OFL-1.1",
    url: "https://fonts.google.com/specimen/Libre+Caslon+Display",
    use: "Font, loaded from Google Fonts",
    licenseUrl: "https://openfontlicense.org/open-font-license-official-text/",
  },
];
