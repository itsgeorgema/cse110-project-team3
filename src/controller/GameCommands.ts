import type { LevelAddress } from "../model/LevelAddress.ts";

export interface RawInput extends LevelAddress {
  /** Exactly what the player typed, keyed by LevelDataConfig.inputVariables. */
  readonly fields: Readonly<Record<string, string>>;
}

/** What LevelUI and the overworld depend on, so tests can pass a fake controller. */
export interface GameCommands {
  submitAnswer(raw: RawInput): void;
  saveDraft(raw: RawInput): void;
  selectLevel(level: LevelAddress): void;
}
