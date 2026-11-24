import type { KonvaStage } from "../KonvaStage.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";

/** Builds one game's AnimationEngine on the stage it draws on. */
export type AnimationBuilder = (stage: KonvaStage) => AnimationEngine;

/**
 * Creates the AnimationEngine for a game id (Factory, #24).
 * The registry is the only list of games: adding a game is one new
 * AnimationEngine class plus one registry entry.
 */
export class AnimationFactory {
  private readonly registry: Readonly<Record<string, AnimationBuilder>>;

  constructor(registry: Readonly<Record<string, AnimationBuilder>>) {
    this.registry = registry;
  }

  /** True when gameId has an engine registered. */
  has(gameId: string): boolean {
    return Object.hasOwn(this.registry, gameId);
  }

  /** Throws when no game is registered under gameId. */
  create(gameId: string, stage: KonvaStage): AnimationEngine {
    if (!this.has(gameId)) {
      throw new Error(`gameId does not exist: ${gameId}`);
    }

    const builder = this.registry[gameId];
    return builder(stage);
  }
}
