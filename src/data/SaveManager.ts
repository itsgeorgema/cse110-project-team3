import type { LevelAddress } from "../model/LevelAddress.ts";
import type { SaveData, SavedAttempt } from "./SaveData.ts";
import type { AnswerValidationResult } from "../model/AnswerValidator.ts";

const SCHEMA_VERSION = 2;
const LEGACY_SCHEMA_VERSION = 1;
const DEFAULT_STORAGE_KEY = "escape-route-progress";

/** A save written before attempt history existed (#81). load() upgrades it. */
interface LegacySave {
  readonly schemaVersion: typeof LEGACY_SCHEMA_VERSION;
  readonly completedLevels: readonly LevelAddress[];
  readonly currentLevel?: LevelAddress | null;
}

/** Reads and writes saved progress and attempt history in browser localStorage. */
export class SaveManager {
  private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  private readonly storageKey: string;

  constructor(
    storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
    storageKey = DEFAULT_STORAGE_KEY,
  ) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  load(): SaveData {
    const serialized = this.storage.getItem(this.storageKey);
    if (serialized === null) return this.emptySave();

    try {
      const parsed: unknown = JSON.parse(serialized);
      if (!this.isStoredSave(parsed)) return this.emptySave();
      return {
        schemaVersion: SCHEMA_VERSION,
        completedLevels: parsed.completedLevels.map((level) => ({ ...level })),
        currentLevel:
          parsed.currentLevel && this.isLevelAddress(parsed.currentLevel)
            ? { ...parsed.currentLevel }
            : null,
        // A version 1 save has no history yet, so it upgrades with none.
        attempts:
          parsed.schemaVersion === LEGACY_SCHEMA_VERSION
            ? []
            : parsed.attempts.map((attempt) => ({
                ...attempt,
                values: { ...attempt.values },
              })),
      };
    } catch {
      return this.emptySave();
    }
  }
  /** Keeps the saved attempts, so map moves never wipe the history. */
  save(
    completedLevels: readonly LevelAddress[],
    currentLevel: LevelAddress | null,
  ): void {
    this.write({
      schemaVersion: SCHEMA_VERSION,
      completedLevels: completedLevels.map((level) => ({ ...level })),
      currentLevel: currentLevel ? { ...currentLevel } : null,
      attempts: this.load().attempts,
    });
  }
  /** Call once per checked answer, after playback, to add it to the saved history. */
  recordAttempt(result: AnswerValidationResult): void {
    const current = this.load();
    const { gameId, levelId, values } = result.submittedAnswer;
    const attempt: SavedAttempt = {
      gameId,
      levelId,
      values: { ...values },
      correct: result.correct,
    };
    this.write({ ...current, attempts: [...current.attempts, attempt] });
  }

  /** Call after a level's successful completion event to persist its address. */
  recordCompletedLevel(level: LevelAddress): void {
    const current = this.load();
    const alreadyCompleted = current.completedLevels.some(
      (completed) =>
        completed.gameId === level.gameId &&
        completed.levelId === level.levelId,
    );
    const completedLevels = alreadyCompleted
      ? current.completedLevels
      : [...current.completedLevels, level];
    this.save(completedLevels, current.currentLevel);
  }

  reset(): void {
    this.storage.removeItem(this.storageKey);
  }

  private write(data: SaveData): void {
    this.storage.setItem(this.storageKey, JSON.stringify(data));
  }

  private emptySave(): SaveData {
    return {
      schemaVersion: SCHEMA_VERSION,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    };
  }

  private isStoredSave(value: unknown): value is SaveData | LegacySave {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Record<string, unknown>;
    const hasValidProgress =
      Array.isArray(record.completedLevels) &&
      record.completedLevels.every((level) => this.isLevelAddress(level)) &&
      (record.currentLevel === undefined ||
        record.currentLevel === null ||
        this.isLevelAddress(record.currentLevel));
    if (!hasValidProgress) return false;
    if (record.schemaVersion === LEGACY_SCHEMA_VERSION) return true;
    return (
      record.schemaVersion === SCHEMA_VERSION &&
      Array.isArray(record.attempts) &&
      record.attempts.every((attempt) => this.isSavedAttempt(attempt))
    );
  }

  private isSavedAttempt(value: unknown): value is SavedAttempt {
    if (!this.isLevelAddress(value)) return false;
    const { values, correct } = value as {
      values?: unknown;
      correct?: unknown;
    };
    return (
      typeof correct === "boolean" &&
      typeof values === "object" &&
      values !== null &&
      !Array.isArray(values) &&
      Object.values(values).every((number) => Number.isFinite(number))
    );
  }

  private isLevelAddress(value: unknown): value is LevelAddress {
    if (typeof value !== "object" || value === null) return false;
    const address = value as Record<string, unknown>;
    return (
      typeof address.gameId === "string" &&
      address.gameId.length > 0 &&
      Number.isInteger(address.levelId)
    );
  }
}
