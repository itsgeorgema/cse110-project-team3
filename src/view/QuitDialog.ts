export type QuitChoice = "keep" | "delete";

/**
 * Asks how to quit (#3): keep the saved progress or delete it. After a choice
 * the page shows a goodbye screen with a way back into the game.
 */
export class QuitDialog {
  private readonly dialog = document.createElement("dialog");
  private readonly app: HTMLElement;
  private readonly onQuit: (choice: QuitChoice) => void;
  private readonly onPlayAgain: () => void;
  private returnFocus: HTMLElement | undefined;

  constructor(
    host: HTMLElement,
    app: HTMLElement,
    onQuit: (choice: QuitChoice) => void,
    onPlayAgain: () => void,
  ) {
    this.app = app;
    this.onQuit = onQuit;
    this.onPlayAgain = onPlayAgain;
    this.dialog.className = "quit-dialog";
    this.dialog.setAttribute("aria-labelledby", "quit-dialog-title");
    const title = document.createElement("h2");
    title.id = "quit-dialog-title";
    title.textContent = "Quit the game?";
    const text = document.createElement("p");
    text.textContent =
      "Keep your progress to continue later in this browser, or delete it to start over next time.";
    const keep = this.button("Save and quit", () => this.quit("keep"));
    keep.classList.add("quit-primary");
    const remove = this.button("Delete progress and quit", () =>
      this.quit("delete"),
    );
    const cancel = this.button("Keep playing", () => this.dialog.close());
    const actions = document.createElement("div");
    actions.className = "quit-actions";
    actions.append(keep, remove, cancel);
    this.dialog.append(title, text, actions);
    this.dialog.addEventListener("close", () => this.returnFocus?.focus());
    host.append(this.dialog);
  }

  open(trigger: HTMLElement): void {
    this.returnFocus = trigger;
    if (!this.dialog.open) this.dialog.showModal();
  }

  private quit(choice: QuitChoice): void {
    this.returnFocus = undefined;
    this.dialog.close();
    this.onQuit(choice);
    this.showGoodbye(choice);
  }

  private showGoodbye(choice: QuitChoice): void {
    const screen = document.createElement("main");
    screen.className = "quit-screen";
    const title = document.createElement("h1");
    title.textContent = "See you soon";
    const text = document.createElement("p");
    text.setAttribute("role", "status");
    text.textContent =
      choice === "keep"
        ? "Your progress is saved in this browser. You can close this tab."
        : "Your progress was deleted. You can close this tab.";
    const again = this.button("Play again", this.onPlayAgain);
    screen.append(title, text, again);
    this.app.replaceChildren(screen);
    again.focus();
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }
}
