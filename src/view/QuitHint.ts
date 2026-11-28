/** How long the hint stays on screen, in milliseconds. */
export const QUIT_HINT_DURATION = 6000;

/**
 * Tells the player to leave with the Quit button when they try to close the
 * tab (#133), and briefly highlights that button. The hint is a popover, so it
 * sits in the top layer above modal dialogs such as the level panel. While a
 * modal is open the hint moves inside it, because a modal makes the rest of
 * the page inert and screen readers would skip the hint there.
 */
export class QuitHint {
  private readonly hint = document.createElement("p");
  private readonly host: HTMLElement;
  private readonly app: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  // A modal opening or closing while the hint shows; move and raise it.
  private readonly modalWatcher = new MutationObserver(() => this.raise());

  constructor(host: HTMLElement, app: HTMLElement) {
    this.host = host;
    this.app = app;
    this.hint.className = "quit-hint";
    this.hint.setAttribute("role", "status");
    this.hint.popover = "manual";
    host.append(this.hint);
  }

  get isShowing(): boolean {
    return this.hint.matches(":popover-open");
  }

  show(): void {
    const quit = this.app.querySelector<HTMLElement>(".quit-game");
    // The goodbye screen has no Quit button and needs no hint.
    if (!quit) return;
    this.hint.textContent =
      "To leave, use the Quit button at the top right so your progress is saved.";
    this.raise();
    this.modalWatcher.observe(document.body, {
      subtree: true,
      attributeFilter: ["open"],
    });
    quit.classList.add("quit-game--highlight");
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hide(), QUIT_HINT_DURATION);
  }

  hide(): void {
    clearTimeout(this.hideTimer);
    this.modalWatcher.disconnect();
    if (this.isShowing) this.hint.hidePopover();
    this.app
      .querySelector(".quit-game")
      ?.classList.remove("quit-game--highlight");
  }

  /** Puts the hint above everything else in the top layer, modals included. */
  private raise(): void {
    if (this.isShowing) this.hint.hidePopover();
    const modals = document.querySelectorAll("dialog:modal");
    const parent = modals[modals.length - 1] ?? this.host;
    if (this.hint.parentElement !== parent) parent.append(this.hint);
    this.hint.showPopover();
  }
}
