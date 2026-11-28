/** How long the hint stays on screen, in milliseconds. */
export const QUIT_HINT_DURATION = 6000;

/**
 * Tells the player to leave with the Quit button after they cancel the
 * browser's own close prompt (#133), and briefly highlights that button.
 */
export class QuitHint {
  private readonly hint = document.createElement("p");
  private readonly app: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(host: HTMLElement, app: HTMLElement) {
    this.app = app;
    this.hint.className = "quit-hint";
    this.hint.setAttribute("role", "status");
    this.hint.hidden = true;
    host.append(this.hint);
  }

  show(): void {
    const quit = this.app.querySelector<HTMLElement>(".quit-game");
    // The goodbye screen has no Quit button and needs no hint.
    if (!quit) return;
    this.hint.textContent =
      "To leave, use the Quit button at the top right so your progress is saved.";
    this.hint.hidden = false;
    quit.classList.add("quit-game--highlight");
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hide(), QUIT_HINT_DURATION);
  }

  hide(): void {
    this.hint.hidden = true;
    this.app
      .querySelector(".quit-game")
      ?.classList.remove("quit-game--highlight");
  }
}
