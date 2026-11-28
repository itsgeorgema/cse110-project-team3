import type { LicenseNotice } from "./licenseNotices.ts";

/**
 * Lists the game's license and the open source software it uses, with each
 * bundled package's full license text (#35). Content is set as DOM text, so
 * license files are never parsed as HTML.
 */
export class LicensesDialog {
  private readonly dialog = document.createElement("dialog");
  private returnFocus: HTMLElement | undefined;

  constructor(
    host: HTMLElement,
    game: LicenseNotice,
    thirdParty: readonly LicenseNotice[],
  ) {
    this.dialog.className = "licenses-dialog";
    this.dialog.setAttribute("aria-labelledby", "licenses-dialog-title");
    const title = document.createElement("h2");
    title.id = "licenses-dialog-title";
    title.textContent = "Licenses";
    const intro = document.createElement("p");
    intro.textContent =
      "Escape Route is open source. It is built with the open source software below, used under their licenses.";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "licenses-close";
    close.textContent = "Close";
    close.addEventListener("click", () => this.dialog.close());
    this.dialog.append(
      title,
      intro,
      this.section("This game", [game]),
      this.section("Open source software", thirdParty),
      close,
    );
    this.dialog.addEventListener("close", () => this.returnFocus?.focus());
    host.append(this.dialog);
  }

  open(trigger: HTMLElement): void {
    this.returnFocus = trigger;
    if (!this.dialog.open) this.dialog.showModal();
  }

  private section(
    heading: string,
    notices: readonly LicenseNotice[],
  ): HTMLElement {
    const section = document.createElement("section");
    const h3 = document.createElement("h3");
    h3.textContent = heading;
    const list = document.createElement("ul");
    list.className = "license-list";
    list.append(...notices.map((notice) => this.entry(notice)));
    section.append(h3, list);
    return section;
  }

  private entry(notice: LicenseNotice): HTMLLIElement {
    const item = document.createElement("li");
    const header = document.createElement("div");
    header.className = "license-entry-header";
    const name = document.createElement("a");
    name.href = notice.url;
    name.target = "_blank";
    name.rel = "noopener noreferrer";
    name.textContent = notice.name;
    const badge = document.createElement("span");
    badge.className = "license-badge";
    badge.textContent = notice.license;
    header.append(name, badge);
    const use = document.createElement("p");
    use.className = "license-use";
    use.textContent = notice.use;
    item.append(header, use);
    if (notice.text !== undefined) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `${notice.license} license text`;
      const text = document.createElement("pre");
      text.textContent = notice.text;
      details.append(summary, text);
      item.append(details);
    } else if (notice.licenseUrl !== undefined) {
      const link = document.createElement("a");
      link.className = "license-text-link";
      link.href = notice.licenseUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `Read the ${notice.license} license`;
      item.append(link);
    }
    return item;
  }
}
