import type { LevelAddress } from "../model/LevelAddress.ts";
import type { OverworldGraph, OverworldNode } from "../model/OverworldGraph.ts";
import type { ProgressTracker } from "../model/ProgressTracker.ts";
import { ProgressionSystem } from "./ProgressionSystem.ts";

export type NavigationFailure = {
  readonly ok: false;
  readonly reason: "unknown" | "locked" | "unimplemented" | "not-adjacent";
  readonly message: string;
};
export type NavigationResult =
  | NavigationFailure
  | {
      readonly ok: true;
      readonly from: OverworldNode;
      readonly to: OverworldNode;
    };

/** Graph routing for the map. Moving does not complete a level or load its screen. */
export class OverworldNavigation {
  readonly graph: OverworldGraph;
  private readonly progression: ProgressionSystem;
  private readonly completion: Pick<ProgressTracker, "isCompleted">;
  private readonly registered: ReadonlySet<OverworldNode>;
  private position: OverworldNode;

  constructor(
    graph: OverworldGraph,
    registeredLevels: readonly LevelAddress[],
    completion: Pick<ProgressTracker, "isCompleted">,
    savedPosition: LevelAddress | null = null,
  ) {
    this.graph = graph;
    this.completion = completion;
    this.progression = new ProgressionSystem(
      completion,
      graph.nodes.map((node) => node.level),
    );
    const registered = new Set<OverworldNode>();
    for (const level of registeredLevels) {
      const node = graph.findLevel(level);
      if (node) registered.add(node);
    }
    this.registered = registered;
    this.position = this.startingNode(savedPosition);
  }

  get current(): OverworldNode {
    return this.position;
  }

  status(level: LevelAddress): "cleared" | "current" | "locked" {
    if (!this.graph.findLevel(level)) return "locked";
    if (this.completion.isCompleted(level)) return "cleared";
    return this.progression.isAvailable(level) ? "current" : "locked";
  }

  isRegistered(level: LevelAddress): boolean {
    const node = this.graph.findLevel(level);
    return node !== undefined && this.registered.has(node);
  }

  checkDestination(level: LevelAddress): NavigationResult {
    const to = this.graph.findLevel(level);
    if (!to)
      return {
        ok: false,
        reason: "unknown",
        message: "This location is not on the map.",
      };
    if (!this.progression.isAvailable(level))
      return {
        ok: false,
        reason: "locked",
        message: "Complete the earlier levels to unlock this location.",
      };
    if (!this.registered.has(to))
      return {
        ok: false,
        reason: "unimplemented",
        message: "This level is coming soon.",
      };
    if (
      to.id !== this.position.id &&
      !this.graph.isAdjacent(this.position.id, to.id)
    ) {
      return {
        ok: false,
        reason: "not-adjacent",
        message: "Follow the path one neighboring location at a time.",
      };
    }
    return { ok: true, from: this.position, to };
  }

  selectLevel(level: LevelAddress): NavigationResult {
    const result = this.checkDestination(level);
    if (result.ok) this.position = result.to;
    return result;
  }

  /** Call after clearing saved completion state. */
  reset(): void {
    this.position = this.startingNode(null);
  }

  private startingNode(saved: LevelAddress | null): OverworldNode {
    const restored = saved && this.graph.findLevel(saved);
    if (
      restored &&
      this.registered.has(restored) &&
      this.progression.isAvailable(restored.level)
    )
      return restored;
    const available = this.graph.nodes.filter(
      (node) =>
        this.registered.has(node) && this.progression.isAvailable(node.level),
    );
    const start =
      available.find((node) => !this.completion.isCompleted(node.level)) ??
      available.at(-1);
    if (!start)
      throw new Error("Overworld needs an available registered starting level");
    return start;
  }
}
