import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { LevelAddress } from "../model/LevelAddress.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import { GameController } from "./GameController.ts";
import type { RawInput } from "./GameCommands.ts";
import type { LevelManager, LevelLoadResult } from "./LevelManager.ts";

/** The view is constructed only after the loader accepts a configuration. */
export interface LevelScreen {
  clear(): void;
  showLevel(config: LevelDataConfig, submit: (raw: RawInput) => void): void;
  showLoadError(message: string, retry: () => void): void;
  showInputErrors(errors: Readonly<Record<string, string>>): void;
  showFeedback(message: string): void;
}

/** One active practice problem; old screen callbacks become inert on navigation. */
export class LevelSession {
  private revision = 0;
  private readonly loader: Pick<LevelManager, "loadModule">;
  private readonly screen: LevelScreen;

  constructor(loader: Pick<LevelManager, "loadModule">, screen: LevelScreen) {
    this.loader = loader;
    this.screen = screen;
  }

  selectLevel(address: LevelAddress): LevelLoadResult {
    const requested = { ...address };
    this.close();
    const revision = this.revision;
    const result = this.loader.loadModule(requested);
    if (!result.ok) {
      this.screen.showLoadError(result.message, () => {
        if (revision === this.revision) this.selectLevel(requested);
      });
      return result;
    }

    const controller = new GameController(
      result.config,
      (errors) => this.screen.showInputErrors(errors),
      new DefaultAnswerValidator(),
      (answer) => this.screen.showFeedback(answer.feedback),
    );
    this.screen.showLevel(result.config, (raw) => {
      if (revision !== this.revision) return;
      this.screen.showInputErrors({});
      this.screen.showFeedback("");
      controller.submitAnswer(raw);
    });
    return result;
  }

  close(): void {
    this.revision += 1;
    this.screen.clear();
  }
}
