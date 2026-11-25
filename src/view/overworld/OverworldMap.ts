import type { LevelAddress } from "../../model/LevelAddress.ts";
import type { OverworldNavigation } from "../../controller/OverworldNavigation.ts";
import { chapters, previewNodes } from "./mapPreview.ts";
import type { MapNode } from "./mapPreview.ts";

/** Progress file and quit actions from the sidebar and top bar (#3). */
export interface ProgressActions {
  downloadProgress(): void;
  /** Resolves to an error message to show, or undefined after a successful import. */
  importProgress(file: File): Promise<string | undefined>;
  quit(trigger: HTMLButtonElement): void;
}

const noProgressActions: ProgressActions = {
  downloadProgress: () => {},
  importProgress: async () => undefined,
  quit: () => {},
};

type ProgressMapNode = MapNode & {
  readonly state: "cleared" | "current" | "locked";
};

const lock =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>';
const star =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.8 6.4 7 .7-5.3 4.6 1.6 6.8-6.1-3.6-6.1 3.6 1.6-6.8L2.2 9.1l7-.7Z"/></svg>';

/** Story map with loading actions for available, registered levels. */
export class OverworldMap {
  private readonly container: HTMLDivElement;
  private readonly navigation: OverworldNavigation;
  private readonly saveCurrentLevel: (level: MapNode["level"]) => void;
  private readonly resetSavedProgress: () => void;
  private readonly openLevel: (
    level: LevelAddress,
    trigger: HTMLButtonElement,
  ) => void;
  private readonly progressActions: ProgressActions;

  constructor(
    container: HTMLDivElement,
    navigation: OverworldNavigation,
    saveCurrentLevel: (level: MapNode["level"]) => void = () => {},
    resetSavedProgress: () => void = () => {},
    openLevel: (
      level: LevelAddress,
      trigger: HTMLButtonElement,
    ) => void = () => {},
    progressActions: ProgressActions = noProgressActions,
  ) {
    this.container = container;
    this.navigation = navigation;
    this.saveCurrentLevel = saveCurrentLevel;
    this.resetSavedProgress = resetSavedProgress;
    this.openLevel = openLevel;
    this.progressActions = progressActions;
    this.render();
  }

  /**
   * Redraws the map from the current progress, keeping the scroll position.
   * Call it after progress changes off the map, such as a level cleared in
   * the level panel. Focus lands on the selected level's action button, the
   * one that opened the level, since the redraw replaces it.
   */
  refresh(): void {
    const scrollTop = this.container.querySelector(".map-scroll")!.scrollTop;
    this.render();
    this.container.querySelector(".map-scroll")!.scrollTop = scrollTop;
    this.container.querySelector<HTMLButtonElement>(".open-level")?.focus();
  }

  private render(): void {
    const nodes: ProgressMapNode[] = previewNodes.map((node) => ({
      ...node,
      ...this.navigation.graph.getNode(node.id)!,
      state: this.navigation.status(node.level),
    }));
    const current = nodes.find(
      (node) => node.id === this.navigation.current.id,
    )!;
    const cleared = nodes.filter((node) => node.state === "cleared").length;
    const selected = current;
    this.container.innerHTML = `
      <header class="topbar"><a class="wordmark" href="#" aria-label="Escape Route, top of map">ESCAPE ROUTE</a><span class="edition">A CIRCUS STORY</span><span class="topbar-actions"><span class="preview-badge">Story map</span><button class="quit-game" type="button">Quit</button></span></header>
      <main class="overworld">
        <aside class="story-sidebar">
          <h1>The Great<br>Escape</h1>
          <div class="journey-progress"><div><span>Your journey</span><span>${cleared} <span class="muted">/ ${nodes.length} cleared</span></span></div><progress value="${cleared}" max="${nodes.length}">${cleared} of ${nodes.length} cleared</progress><div class="progress-actions"><button class="reset-progress" type="button">Reset progress</button><button class="reset-progress download-progress" type="button">Download progress</button><button class="reset-progress import-progress" type="button">Import progress</button><input class="import-progress-file" type="file" accept=".json,application/json" hidden aria-label="Progress file to import"></div><p class="progress-file-status" role="status" aria-live="polite"></p></div>
          <nav class="chapter-nav" aria-label="Story chapters">${chapters.map((chapter, index) => `<button class="chapter-link" data-chapter="${index}"><span class="chapter-number">0${index + 1}</span><span><strong>${chapter.title}</strong><small>${index === 0 ? "The story begins" : "Further down the road"}</small></span><span class="chapter-arrow" aria-hidden="true">↗</span></button>`).join("")}</nav>
          <p class="navigation-status" role="status" aria-live="polite"></p>
          <button class="return-button" type="button">◎ &nbsp; Back to your chapter</button>
        </aside>
        <section class="map-column" aria-label="Escape route map">
          <div class="map-toolbar"><span><span class="status-dot"></span> THE PATH TO FREEDOM</span><span>Scroll to explore <span aria-hidden="true">↓</span></span></div>
          <div class="map-scroll" tabindex="0" role="region" aria-label="Scrollable story map">
            <div class="map-world">
              ${this.landscape()}
              ${chapters.map((chapter, index) => `<div id="chapter-${index}" class="chapter-heading" style="top:${chapter.y + 36}px"><span>CHAPTER 0${index + 1}</span><h2>${chapter.title}</h2><p>${chapter.subtitle}</p></div>`).join("")}
              <svg class="route-lines" viewBox="0 0 680 1770" preserveAspectRatio="none" aria-hidden="true">${this.navigation.graph.connections
                .map(([fromId, toId]) => {
                  const from = nodes.find((node) => node.id === fromId)!;
                  const to = nodes.find((node) => node.id === toId)!;
                  const path = `M ${from.x} ${from.y} C ${from.x} ${from.y + 110}, ${to.x} ${to.y - 110}, ${to.x} ${to.y}`;
                  return `<path class="route-bed" d="${path}"/><path class="route ${from.state === "cleared" ? "traveled" : ""}" d="${path}"/>`;
                })
                .join("")}</svg>
              ${nodes.map((node, index) => `<button type="button" class="map-node ${node.state}" data-node="${node.id}" style="left:${(node.x / 680) * 100}%;top:${node.y}px" aria-label="Level ${index + 1}: ${node.title}, ${node.id === current.id ? "you are here" : node.state}. Select location." aria-pressed="${node.id === selected.id}" aria-disabled="${!this.navigation.checkDestination(node.level).ok}">${node.id === current.id ? '<span class="you-are-here">YOU ARE HERE</span><span class="clown" aria-hidden="true"><i class="clown-hat"></i><i class="clown-face"><b></b></i></span>' : ""}<span class="node-circle">${node.state === "cleared" ? '<span aria-hidden="true">✓</span>' : node.state === "locked" ? lock : `<span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>`}</span><span class="node-label"><small>LEVEL 0${index + 1}</small><strong>${node.title}</strong>${node.state === "cleared" ? `<span class="node-stars">${star}${star}${star}</span><span class="node-caption">Completed</span>` : `<span class="node-caption">${node.state === "current" ? "Your next chapter" : "Still to be discovered"}</span>`}</span></button>`).join("")}
              <div class="map-ending"><span aria-hidden="true">✦</span> THE WORLD IS BIGGER THAN THE BIG TOP.</div>
            </div>
          </div>
          <div class="map-legend"><span><i class="legend-cleared"></i>Cleared</span><span><i class="legend-current"></i>You are here</span><span>${lock}Undiscovered</span></div>
        </section>
        <aside class="story-preview" aria-label="Selected level story" aria-live="polite"></aside>
      </main>`;
    this.showPreview(selected);
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-node]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const node = nodes.find((item) => item.id === button.dataset.node)!;
          const result = this.navigation.selectLevel(node.level);
          if (!result.ok) {
            this.container.querySelector(".navigation-status")!.textContent =
              result.message;
            return;
          }
          if (result.from.id !== result.to.id)
            this.saveCurrentLevel(result.to.level);
          const scrollTop =
            this.container.querySelector(".map-scroll")!.scrollTop;
          this.render();
          this.container.querySelector(".map-scroll")!.scrollTop = scrollTop;
          this.container
            .querySelector<HTMLButtonElement>(`[data-node="${node.id}"]`)!
            .focus();
        });
      });
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-chapter]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          this.scrollTo(chapters[Number(button.dataset.chapter)].y),
        ),
      );
    this.container
      .querySelector(".return-button")!
      .addEventListener("click", () => {
        this.scrollTo(current.y - 260);
        this.container
          .querySelector<HTMLButtonElement>(`[data-node="${current.id}"]`)!
          .click();
      });
    this.container
      .querySelector<HTMLButtonElement>(".reset-progress")!
      .addEventListener("click", () => {
        this.resetSavedProgress();
        this.navigation.reset();
        this.render();
      });
    this.bindProgressActions();
  }

  private bindProgressActions(): void {
    const fileInput = this.container.querySelector<HTMLInputElement>(
      ".import-progress-file",
    )!;
    const status = this.container.querySelector(".progress-file-status")!;
    this.container
      .querySelector<HTMLButtonElement>(".download-progress")!
      .addEventListener("click", () => {
        this.progressActions.downloadProgress();
        status.textContent = "Progress file downloaded.";
      });
    this.container
      .querySelector<HTMLButtonElement>(".import-progress")!
      .addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      const error = await this.progressActions.importProgress(file);
      if (error !== undefined) status.textContent = error;
    });
    this.container
      .querySelector<HTMLButtonElement>(".quit-game")!
      .addEventListener("click", (event) =>
        this.progressActions.quit(event.currentTarget as HTMLButtonElement),
      );
  }

  private scrollTo(top: number): void {
    this.container.querySelector(".map-scroll")!.scrollTo({
      top,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  private showPreview(node: ProgressMapNode): void {
    this.container.querySelector(".story-preview")!.innerHTML = `
      <div class="preview-illustration" aria-hidden="true"><svg viewBox="0 0 260 180"><circle cx="192" cy="40" r="22" fill="#e9d9a8"/><path d="M0 145Q65 108 130 142T260 134V180H0" fill="#28474b"/><path d="M45 126 130 46 215 126Z" fill="#d9bd8c"/><path d="m130 46-28 80h56Z" fill="#a95841"/><path d="M55 126h150v42H55Z" fill="#bd7653"/><path d="M109 168v-36q21-27 42 0v36" fill="#162c34"/><path d="M130 46V20l28 9-28 9" fill="#bc7050"/><path d="M28 168h205" stroke="#e1ce9b" opacity=".4"/><g fill="#e9d9a8"><circle cx="36" cy="45" r="1.5"/><circle cx="76" cy="26" r="1"/><circle cx="223" cy="85" r="1.5"/></g></svg><span>TALES FROM THE CIRCUS</span></div>
      <div class="preview-copy"><div class="eyebrow">CHAPTER 0${node.chapter + 1} <span> / </span> LEVEL 0${previewNodes.findIndex((entry) => entry.id === node.id) + 1}</div><h2>${node.title}</h2><p class="preview-subtitle">${node.subtitle}</p><div class="story-divider"></div><p class="story-text">${node.story}</p><div class="level-status ${node.state}">${node.state === "locked" ? lock : '<span aria-hidden="true">' + (node.state === "cleared" ? "✓" : "◎") + "</span>"}<span>${node.state === "locked" ? "An undiscovered part of your story" : node.state === "cleared" ? "A little closer to freedom" : "This is where we left off"}</span></div>${this.levelAction(node)}</div>`;
    this.container
      .querySelector<HTMLButtonElement>(".open-level")
      ?.addEventListener("click", (event) => {
        if (this.navigation.checkDestination(node.level).ok) {
          this.openLevel(node.level, event.currentTarget as HTMLButtonElement);
        }
      });
  }

  private levelAction(node: ProgressMapNode): string {
    if (node.state === "locked")
      return '<button class="play-placeholder" disabled>Chapter locked</button>';
    if (!this.navigation.isRegistered(node.level))
      return '<button class="play-placeholder" disabled>Level coming soon</button>';
    return `<button class="results-preview-button open-level" type="button">${node.state === "cleared" ? "Replay level" : "Start level"}</button>`;
  }

  private landscape(): string {
    return `<svg class="landscape" viewBox="0 0 680 1770" preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id="map-speckles" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="8" cy="16" r="1" fill="#9db9af" opacity=".17"/></pattern><g id="tree"><path d="m0 0-18 35h10l-16 27H24L8 35h10Z" fill="#304e4d"/><path d="M0 40v32" stroke="#1b333b" stroke-width="4"/></g><g id="tent"><path d="m0 0-67 67H67Z" fill="#b1ad8f"/><path d="M0 0-21 67h42Z" fill="#805b51"/><path d="M-58 67H58v43H-58Z" fill="#8b7c64"/><path d="M-14 110V80q14-16 28 0v30" fill="#182f37"/><path d="M0 0v-25l25 8-25 8" fill="#bc9466"/></g></defs>
      <path d="M0 0H680V1770H0Z" fill="#213b42"/><path d="M0 0h680v620Q490 690 305 630T0 720Z" fill="#263f45"/><path d="M0 1130q180-90 350 60t330-20v600H0Z" fill="#29474b"/>
      <path d="M645 0Q470 180 590 390T560 760Q470 920 620 1100T550 1440Q470 1610 620 1770" fill="none" stroke="#355b66" stroke-width="53"/><path d="M645 0Q470 180 590 390T560 760Q470 920 620 1100T550 1440Q470 1610 620 1770" fill="none" stroke="#436c76" stroke-width="35"/>
      <path d="M0 0H680V1770H0Z" fill="url(#map-speckles)"/>
      <g fill="#dce6cf" opacity=".75"><circle cx="365" cy="45" r="1.4"/><circle cx="420" cy="87" r="1"/><circle cx="545" cy="35" r="1.6"/><circle cx="80" cy="340" r="1.2"/><circle cx="575" cy="440" r="1.5"/><circle cx="165" cy="635" r="1.1"/><circle cx="520" cy="715" r="1.4"/><circle cx="55" cy="970" r="1.2"/><circle cx="360" cy="1165" r="1.6"/><circle cx="580" cy="1340" r="1.3"/><circle cx="150" cy="1550" r="1.5"/></g>
      <g transform="translate(600 85)"><circle r="25" fill="#d8dfc5"/><circle cx="10" cy="-7" r="23" fill="#263f45"/></g>
      <g opacity=".8"><use href="#tree" x="76" y="150"/><use href="#tree" x="105" y="182"/><use href="#tree" x="57" y="211"/><use href="#tree" x="558" y="520"/><use href="#tree" x="600" y="552"/><use href="#tree" x="78" y="740"/><use href="#tree" x="108" y="780"/><use href="#tree" x="46" y="810"/><use href="#tree" x="530" y="1170"/><use href="#tree" x="564" y="1200"/><use href="#tree" x="75" y="1450"/><use href="#tree" x="104" y="1480"/></g>
      <g transform="translate(480 170) rotate(8)"><use href="#tent"/><text y="137" text-anchor="middle">THE BIG TOP</text></g>
      <g transform="translate(120 420) scale(.65)"><use href="#tent"/></g>
      <g transform="translate(470 1020)" stroke="#75908c" stroke-width="3" fill="none"><circle r="66"/><circle r="7"/><path d="m0 0-35 105M0 0l35 105M-66 0H66M0-66V66M-47-47l94 94M-47 47l94-94"/><g fill="#ae9473" stroke="#ae9473"><rect x="-11" y="-74" width="22" height="14" rx="4"/><rect x="-75" y="-4" width="22" height="14" rx="4"/><rect x="53" y="-4" width="22" height="14" rx="4"/></g></g>
      <g transform="translate(78 1150) rotate(-8)" fill="#7f8d7e"><path d="M0 0h110v8H0zm0 22h110v8H0z"/><path d="M8-12h7v56H8zm30 0h7v56h-7zm30 0h7v56h-7zm30 0h7v56h-7z"/></g>
      <g fill="#6e8b7c"><path d="m130 280 4-12 4 12m-17 2 2-8 3 8M520 730l4-12 4 12m-17 2 2-8 3 8M145 1360l4-12 4 12m-17 2 2-8 3 8"/></g>
      <g transform="translate(450 1570)" stroke="#a0b5a1" fill="none" stroke-width="2"><circle r="30"/><path d="M-48 0h96M0-48v96M-34-34l68 68M-34 34l68-68"/></g>
    </svg>`;
  }
}
