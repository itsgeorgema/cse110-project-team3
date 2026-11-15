import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { LevelAddress } from "../model/LevelAddress.ts";
import type { RawInput } from "../controller/GameCommands.ts";
import type { LevelScreen } from "../controller/LevelSession.ts";

/** Native dialog shared by all registered practice levels. Config text stays text. */
export class LevelPanel implements LevelScreen {
  private readonly dialog = document.createElement("dialog");
  private readonly content = document.createElement("section");
  private readonly feedback = document.createElement("p");
  private readonly fields = new Map<
    string,
    { input: HTMLInputElement; error: HTMLElement }
  >();
  private readonly picker = document.createElement("select");

  constructor(
    host: HTMLElement,
    levels: readonly (LevelAddress & { readonly title: string })[],
    onSelect: (address: LevelAddress) => void,
    onClose: () => void,
  ) {
    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.textContent = "Practice levels";
    launcher.addEventListener("click", () => this.open());
    host.className = "practice-entry";
    host.append(launcher, this.dialog);
    this.dialog.className = "level-panel";
    this.dialog.setAttribute("aria-labelledby", "level-panel-title");
    const title = document.createElement("h2");
    title.id = "level-panel-title";
    title.textContent = "Practice a physics problem";
    const note = document.createElement("p");
    note.textContent =
      "Try a problem and check your answer. Practice does not change story progress.";
    const label = document.createElement("label");
    label.textContent = "Choose a level";
    this.picker.id = "practice-level";
    label.htmlFor = this.picker.id;
    levels.forEach((level, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.dataset.gameId = level.gameId;
      option.dataset.levelId = String(level.levelId);
      option.textContent = level.title;
      this.picker.append(option);
    });
    const load = document.createElement("button");
    load.type = "button";
    load.textContent = "Load level";
    load.disabled = levels.length === 0;
    load.addEventListener("click", () =>
      onSelect(levels[Number(this.picker.value)]),
    );
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Return to story map";
    close.addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("close", () => {
      onClose();
      launcher.focus();
    });
    this.content.setAttribute("aria-label", "Loaded problem");
    this.feedback.setAttribute("role", "status");
    this.dialog.append(
      title,
      note,
      label,
      this.picker,
      load,
      this.content,
      this.feedback,
      close,
    );
  }

  open(): void {
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
    const option = [...this.picker.options].find(
      (item) =>
        item.dataset.gameId === config.gameId &&
        item.dataset.levelId === String(config.levelId),
    );
    if (option) this.picker.value = option.value;
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
