import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { RawInput } from "../controller/GameCommands.ts";
import type { LevelScreen } from "../controller/LevelSession.ts";

/** Native dialog shared by all loaded levels. Config text stays text. */
export class LevelPanel implements LevelScreen {
  private readonly dialog = document.createElement("dialog");
  private readonly content = document.createElement("section");
  private readonly feedback = document.createElement("p");
  private readonly fields = new Map<
    string,
    { input: HTMLInputElement; error: HTMLElement }
  >();
  private returnFocus: HTMLElement | undefined;
  private readonly title = document.createElement("h2");

  constructor(host: HTMLElement, onClose: () => void) {
    host.append(this.dialog);
    this.dialog.className = "level-panel";
    this.dialog.setAttribute("aria-labelledby", "level-panel-title");
    this.title.id = "level-panel-title";
    this.title.textContent = "Level";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Return to story map";
    close.addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("close", () => {
      onClose();
      this.returnFocus?.focus();
    });
    this.content.setAttribute("aria-label", "Loaded problem");
    this.feedback.setAttribute("role", "status");
    this.dialog.append(this.title, this.content, this.feedback, close);
  }

  open(title: string, trigger: HTMLElement): void {
    this.title.textContent = title;
    this.returnFocus = trigger;
    if (!this.dialog.open) this.dialog.showModal();
  }

  clear(): void {
    this.content.replaceChildren();
    this.fields.clear();
    this.feedback.textContent = "";
  }

  showLoadError(message: string, retry: () => void): void {
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    error.textContent = message;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Try again";
    button.addEventListener("click", retry);
    this.content.append(error, button);
    button.focus();
  }

  showLevel(config: LevelDataConfig, submit: (raw: RawInput) => void): void {
    const problem = document.createElement("p");
    problem.className = "level-problem";
    problem.textContent = config.problemStatement;
    const form = document.createElement("form");
    form.noValidate = true;
    config.userInputVariables.forEach((field, index) => {
      const label = document.createElement("label");
      const unit = config.userInputVariablesUnits[field];
      label.textContent = unit ? `${field} (${unit})` : field;
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.id = `level-answer-${index}`;
      label.htmlFor = input.id;
      const error = document.createElement("p");
      error.id = `${input.id}-error`;
      error.className = "level-field-error";
      input.setAttribute("aria-describedby", error.id);
      this.fields.set(field, { input, error });
      form.append(label, input, error);
    });
    const check = document.createElement("button");
    check.type = "submit";
    check.textContent = "Check answer";
    form.append(check);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit({
        gameId: config.gameId,
        levelId: config.levelId,
        fields: Object.fromEntries(
          [...this.fields].map(([field, { input }]) => [field, input.value]),
        ),
      });
    });
    this.content.append(problem, form);
    this.fields.values().next().value!.input.focus();
  }

  showInputErrors(errors: Readonly<Record<string, string>>): void {
    for (const [field, { input, error }] of this.fields) {
      error.textContent = errors[field] ?? "";
      input.setAttribute("aria-invalid", String(Boolean(errors[field])));
    }
    const first = [...this.fields].find(([field]) => Boolean(errors[field]));
    first?.[1].input.focus();
  }

  showFeedback(message: string): void {
    this.feedback.textContent = message;
  }
}
