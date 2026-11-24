import type { LevelDataConfig } from "../data/LevelDataConfig.ts";
import { assertLevelConfig } from "../data/validateLevelConfig.ts";
import type { LevelAddress } from "../model/LevelAddress.ts";

export interface LevelRegistration extends LevelAddress {
  readonly title: string;
  /** Generate a fresh problem. Unknown forces validation at the loading boundary. */
  readonly createConfig: () => unknown;
}

export type LevelLoadResult =
  | { readonly ok: true; readonly config: LevelDataConfig }
  | {
      readonly ok: false;
      readonly reason: "not-found" | "invalid-config" | "generation-failed";
      readonly message: string;
    };

/** Resolves registered levels and admits only validated configs to the view. */
export class LevelManager {
  private readonly registrations: readonly LevelRegistration[];

  constructor(registrations: readonly LevelRegistration[]) {
    const identities = new Map<string, Set<number>>();
    this.registrations = registrations.map((registration) => {
      const { gameId, levelId, title, createConfig } = registration;
      if (
        !gameId.trim() ||
        !Number.isSafeInteger(levelId) ||
        levelId < 1 ||
        !title.trim()
      ) {
        throw new Error(
          "Level registration requires a valid identity and title",
        );
      }
      const levels = identities.get(gameId) ?? new Set<number>();
      if (levels.has(levelId)) throw new Error("Duplicate level registration");
      levels.add(levelId);
      identities.set(gameId, levels);
      return Object.freeze({ gameId, levelId, title, createConfig });
    });
  }

  /** Presentation metadata only; listing never generates random problems. */
  listLevels(): readonly (LevelAddress & { readonly title: string })[] {
    return this.registrations.map(({ gameId, levelId, title }) => ({
      gameId,
      levelId,
      title,
    }));
  }

  loadModule(address: LevelAddress): LevelLoadResult {
    const registration = this.registrations.find(
      ({ gameId, levelId }) =>
        gameId === address.gameId && levelId === address.levelId,
    );
    if (!registration) {
      return {
        ok: false,
        reason: "not-found",
        message: "This level is not available. Choose another level.",
      };
    }

    let candidate: unknown;
    try {
      candidate = registration.createConfig();
    } catch {
      return {
        ok: false,
        reason: "generation-failed",
        message:
          "This problem could not be loaded. Try again or choose another level.",
      };
    }
    try {
      // Detach the config from factory-owned objects before validating it.
      const config: unknown = structuredClone(candidate);
      assertLevelConfig(config);
      if (
        config.gameId !== address.gameId ||
        config.levelId !== address.levelId
      ) {
        throw new Error("Generated config does not match the requested level");
      }
      return { ok: true, config };
    } catch {
      return {
        ok: false,
        reason: "invalid-config",
        message:
          "This level has a problem with its setup. Choose another level or try again later.",
      };
    }
  }
}
