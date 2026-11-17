import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import type { LevelAddress } from "../model/LevelAddress.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import { GameController, type PlaybackWiring } from "./GameController.ts";
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

/** Builds the playback wiring (#91) for the level that was just loaded. */
export type PlaybackWiringFactory = (config: LevelDataConfig) => PlaybackWiring;

/**
 * One active level problem; old screen callbacks become inert on navigation,
 * and the previous GameController is disposed so it stops playing and recording.
 */
export class LevelSession {
  private revision = 0;
  private controller: GameController | undefined;
  private readonly loader: Pick<LevelManager, "loadModule">;
  private readonly screen: LevelScreen;
  private readonly playbackFor: PlaybackWiringFactory;

  constructor(
    loader: Pick<LevelManager, "loadModule">,
    screen: LevelScreen,
    playbackFor: PlaybackWiringFactory,
  ) {
    this.loader = loader;
    this.screen = screen;
    this.playbackFor = playbackFor;
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
      this.playbackFor(result.config),
    );
    this.controller = controller;
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
    this.controller?.dispose();
    this.controller = undefined;
    this.screen.clear();
  }
}
