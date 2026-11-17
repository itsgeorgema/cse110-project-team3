import type { LevelAddress } from "./LevelAddress.ts";

/** Routing and layout data shared by map rendering and movement. */
export interface OverworldNode {
  readonly id: string;
  readonly level: LevelAddress;
  readonly x: number;
  readonly y: number;
}

/** An undirected connection; either endpoint can be the start of a walk. */
export type OverworldConnection = readonly [fromId: string, toId: string];

/** Immutable topology. Unlock rules belong to ProgressionSystem, not the graph. */
export class OverworldGraph {
  readonly nodes: readonly OverworldNode[];
  readonly connections: readonly OverworldConnection[];
  private readonly byId = new Map<string, OverworldNode>();
  private readonly byLevel = new Map<string, Map<number, OverworldNode>>();
  private readonly adjacent = new Map<string, Set<string>>();

  constructor(
    nodes: readonly OverworldNode[],
    connections: readonly OverworldConnection[],
  ) {
    if (nodes.length === 0)
      throw new Error("Overworld needs at least one node");
    this.nodes = Object.freeze(
      nodes.map((node) => {
        if (!node.id.trim() || this.byId.has(node.id)) {
          throw new Error("Overworld node IDs must be nonempty and unique");
        }
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
          throw new Error("Overworld node coordinates must be finite");
        }
        const { gameId, levelId } = node.level;
        if (!gameId.trim() || !Number.isSafeInteger(levelId) || levelId < 1) {
          throw new Error("Overworld node must identify a valid level");
        }
        const levels =
          this.byLevel.get(gameId) ?? new Map<number, OverworldNode>();
        if (levels.has(levelId)) {
          throw new Error("A level can belong to only one overworld node");
        }
        const copy = Object.freeze({
          id: node.id,
          level: Object.freeze({ gameId, levelId }),
          x: node.x,
          y: node.y,
        });
        this.byId.set(copy.id, copy);
        levels.set(levelId, copy);
        this.byLevel.set(gameId, levels);
        this.adjacent.set(copy.id, new Set());
        return copy;
      }),
    );

    this.connections = Object.freeze(
      connections.map(([from, to]) => {
        const fromNeighbors = this.adjacent.get(from);
        const toNeighbors = this.adjacent.get(to);
        if (!fromNeighbors || !toNeighbors) {
          throw new Error(
            "Overworld connections must reference existing nodes",
          );
        }
        if (from === to)
          throw new Error("Overworld connections cannot link a node to itself");
        if (fromNeighbors.has(to))
          throw new Error("Duplicate overworld connection");
        fromNeighbors.add(to);
        toNeighbors.add(from);
        return Object.freeze([from, to] as const);
      }),
    );
  }

  getNode(id: string): OverworldNode | undefined {
    return this.byId.get(id);
  }

  findLevel(level: LevelAddress): OverworldNode | undefined {
    return this.byLevel.get(level.gameId)?.get(level.levelId);
  }

  neighbors(id: string): readonly OverworldNode[] {
    return Object.freeze(
      [...(this.adjacent.get(id) ?? [])].map((neighbor) =>
        this.byId.get(neighbor)!,
      ),
    );
  }

  isAdjacent(fromId: string, toId: string): boolean {
    return this.adjacent.get(fromId)?.has(toId) ?? false;
  }
}
