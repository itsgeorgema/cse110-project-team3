import { describe, expect, it } from "vitest";
import { OverworldGraph, type OverworldNode } from "./OverworldGraph.ts";

function nodes(): OverworldNode[] {
  return [
    { id: "car", level: { gameId: "kinematics", levelId: 1 }, x: 100, y: 200 },
    { id: "tent", level: { gameId: "kinematics", levelId: 2 }, x: 300, y: 400 },
    { id: "gate", level: { gameId: "netForce", levelId: 1 }, x: 500, y: 600 },
  ];
}

describe("OverworldGraph", () => {
  it("resolves exact identities, including the same level number in different games", () => {
    const graph = new OverworldGraph(nodes(), [
      ["car", "tent"],
      ["tent", "gate"],
    ]);
    expect(graph.getNode("car")).toEqual(nodes()[0]);
    expect(graph.findLevel({ gameId: "kinematics", levelId: 1 })?.id).toBe(
      "car",
    );
    expect(graph.findLevel({ gameId: "netForce", levelId: 1 })?.id).toBe(
      "gate",
    );
    expect(graph.findLevel({ gameId: "missing", levelId: 1 })).toBeUndefined();
    expect(
      graph.findLevel({ gameId: "kinematics", levelId: 99 }),
    ).toBeUndefined();
    expect(graph.getNode("missing")).toBeUndefined();
  });

  it("connects neighbors in both directions without allowing jumps or self-movement", () => {
    const graph = new OverworldGraph(nodes(), [
      ["car", "tent"],
      ["tent", "gate"],
    ]);
    expect(graph.isAdjacent("car", "tent")).toBe(true);
    expect(graph.isAdjacent("tent", "car")).toBe(true);
    expect(graph.isAdjacent("car", "gate")).toBe(false);
    expect(graph.isAdjacent("car", "car")).toBe(false);
    expect(graph.isAdjacent("missing", "car")).toBe(false);
    expect(graph.isAdjacent("car", "missing")).toBe(false);
    expect(graph.neighbors("tent").map((node) => node.id)).toEqual([
      "car",
      "gate",
    ]);
    expect(graph.neighbors("missing")).toEqual([]);
  });

  it("supports branches and disconnected nodes without inferring connections from array order", () => {
    const graph = new OverworldGraph(nodes(), [
      ["car", "gate"],
      ["car", "tent"],
    ]);
    expect(graph.neighbors("car").map((node) => node.id)).toEqual([
      "gate",
      "tent",
    ]);
    expect(graph.isAdjacent("tent", "gate")).toBe(false);
    const disconnected = new OverworldGraph(nodes(), [["car", "tent"]]);
    expect(disconnected.neighbors("gate")).toEqual([]);
    expect(new OverworldGraph([nodes()[0]], []).neighbors("car")).toEqual([]);
  });

  it("copies constructor inputs and exposes immutable topology and positions", () => {
    const input = nodes();
    const edges: [string, string][] = [["car", "tent"]];
    const graph = new OverworldGraph(input, edges);
    Object.assign(input[0].level, { gameId: "changed" });
    Object.assign(input[0], { id: "changed", x: 999 });
    input.length = 0;
    edges[0][0] = "changed";
    edges.length = 0;
    expect(graph.getNode("car")).toEqual(nodes()[0]);
    expect(graph.connections).toEqual([["car", "tent"]]);
    expect(graph.isAdjacent("car", "tent")).toBe(true);
    expect(() => Object.assign(graph.nodes, { 0: nodes()[2] })).toThrow();
    expect(() => Object.assign(graph.getNode("car")!, { x: 999 })).toThrow();
    expect(() =>
      Object.assign(graph.getNode("car")!.level, { levelId: 99 }),
    ).toThrow();
    expect(() =>
      Object.assign(graph.connections, { 0: ["tent", "gate"] }),
    ).toThrow();
    expect(() => Object.assign(graph.connections[0], { 0: "gate" })).toThrow();
    expect(() =>
      Object.assign(graph.neighbors("car"), { 0: nodes()[2] }),
    ).toThrow();
  });

  it("accepts zero/negative coordinates and IDs that resemble object properties", () => {
    const graph = new OverworldGraph(
      [
        { ...nodes()[0], id: "constructor", x: 0, y: -10 },
        { ...nodes()[1], id: "__proto__" },
      ],
      [["constructor", "__proto__"]],
    );
    expect(graph.isAdjacent("constructor", "__proto__")).toBe(true);
    expect(graph.getNode("constructor")?.y).toBe(-10);
  });

  it("rejects an empty graph", () => {
    expect(() => new OverworldGraph([], [])).toThrow("at least one");
  });

  it.each([
    { id: " " },
    { x: NaN },
    { y: Infinity },
    { level: { gameId: " ", levelId: 1 } },
    { level: { gameId: "kinematics", levelId: 0 } },
    { level: { gameId: "kinematics", levelId: 1.5 } },
    { level: { gameId: "kinematics", levelId: Number.MAX_SAFE_INTEGER + 1 } },
  ])("rejects malformed node %s", (override) => {
    expect(
      () => new OverworldGraph([{ ...nodes()[0], ...override }], []),
    ).toThrow();
  });

  it("rejects duplicate node IDs and duplicate level bindings", () => {
    expect(
      () => new OverworldGraph([nodes()[0], { ...nodes()[1], id: "car" }], []),
    ).toThrow("unique");
    expect(
      () =>
        new OverworldGraph([nodes()[0], { ...nodes()[0], id: "other" }], []),
    ).toThrow("only one");
  });

  it.each([
    [["missing", "car"]],
    [["car", "missing"]],
    [["car", "car"]],
    [
      ["car", "tent"],
      ["car", "tent"],
    ],
    [
      ["car", "tent"],
      ["tent", "car"],
    ],
  ] as [string, string][][])(
    "rejects invalid connections %s",
    (...connections) => {
      expect(() => new OverworldGraph(nodes(), connections)).toThrow();
    },
  );
});
