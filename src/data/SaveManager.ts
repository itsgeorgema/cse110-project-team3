import type { LevelAddress } from "../model/LevelAddress.ts";
import type { SaveData } from "./SaveData.ts";

const SCHEMA_VERSION = 1;
const DEFAULT_STORAGE_KEY = "escape-route-progress";

/** Reads and writes completed level addresses in browser localStorage. */
export class SaveManager {
  private readonly storage: Pick<Storage, "getItem" | "setItem">;
  private readonly storageKey: string;

  constructor(
    storage: Pick<Storage, "getItem" | "setItem">,
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
      if (!this.isSaveData(parsed)) return this.emptySave();
      return {
        schemaVersion: SCHEMA_VERSION,
        completedLevels: parsed.completedLevels.map((level) => ({ ...level })),
      };
    } catch {
      return this.emptySave();
    }
  }

  save(completedLevels: readonly LevelAddress[]): void {
    const data: SaveData = {
      schemaVersion: SCHEMA_VERSION,
      completedLevels: completedLevels.map((level) => ({ ...level })),
    };
    this.storage.setItem(this.storageKey, JSON.stringify(data));
  }

  private emptySave(): SaveData {
    return {
      schemaVersion: SCHEMA_VERSION,
      completedLevels: [],
    };
  }

  private isSaveData(value: unknown): value is SaveData {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Record<string, unknown>;
    return (
      record.schemaVersion === SCHEMA_VERSION &&
      Array.isArray(record.completedLevels) &&
      record.completedLevels.every((level) => this.isLevelAddress(level))
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
