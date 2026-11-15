import { describe, expect, it } from "vitest";
import { OverworldGraph } from "../model/OverworldGraph.ts";
import { OverworldNavigation } from "./OverworldNavigation.ts";

const levels = [1, 2, 3, 4].map((levelId) => ({ gameId: "game", levelId }));
const graph = new OverworldGraph(
  levels.map((level, i) => ({
    id: String(i + 1),
    level,
    x: i * 100,
    y: i * 200,
  })),
  [
    ["1", "2"],
    ["2", "3"],
    ["3", "4"],
  ],
);
function setup(completed: number[] = [], saved: number | null = null) {
  const earned = new Set(completed);
  const navigation = new OverworldNavigation(
    graph,
    levels.slice(0, 3),
    {
      isCompleted: (level) => earned.has(level.levelId),
    },
    saved === null ? null : { gameId: "game", levelId: saved },
  );
  return { navigation, earned };
}
describe("OverworldNavigation", () => {
  it("starts at the first available unfinished registered level", () => {
    expect(setup().navigation.current.id).toBe("1");
    expect(setup([1]).navigation.current.id).toBe("2");
    expect(setup([1, 2]).navigation.current.id).toBe("3");
  });
  it("restores an available position, including a completed replay", () => {
    expect(setup([1, 2], 1).navigation.current.id).toBe("1");
    expect(setup([1], 2).navigation.current.id).toBe("2");
  });
  it("ignores unknown, locked, and unimplemented saved destinations", () => {
    expect(setup([], 99).navigation.current.id).toBe("1");
    expect(setup([], 3).navigation.current.id).toBe("1");
    expect(setup([1, 2, 3], 4).navigation.current.id).toBe("3");
    expect(setup([1, 2, 3, 4]).navigation.current.id).toBe("3");
  });
  it("rejects a catalog with no available map level", () => {
    expect(
      () => new OverworldNavigation(graph, [], { isCompleted: () => false }),
    ).toThrow("starting level");
    expect(
      () =>
        new OverworldNavigation(graph, [levels[1]], {
          isCompleted: () => false,
        }),
    ).toThrow("starting level");
  });
  it("ignores catalog entries for another map", () => {
    const navigation = new OverworldNavigation(
      graph,
      [...levels, { gameId: "other", levelId: 1 }],
      { isCompleted: () => false },
    );
    expect(navigation.current.id).toBe("1");
    expect(navigation.isRegistered({ gameId: "other", levelId: 1 })).toBe(
      false,
    );
    expect(navigation.isRegistered(levels[0])).toBe(true);
  });
  it("derives display status from completion and progression", () => {
    const { navigation } = setup([1, 3]);
    expect(levels.map((level) => navigation.status(level))).toEqual([
      "cleared",
      "current",
      "cleared",
      "locked",
    ]);
    expect(navigation.status({ gameId: "unknown", levelId: 1 })).toBe("locked");
    expect(navigation.isRegistered(levels[3])).toBe(false);
  });
  it("refuses locked, unknown, and unimplemented destinations without moving", () => {
    const { navigation, earned } = setup();
    expect(navigation.selectLevel(levels[1])).toMatchObject({
      ok: false,
      reason: "locked",
    });
    expect(
      navigation.selectLevel({ gameId: "unknown", levelId: 1 }),
    ).toMatchObject({ ok: false, reason: "unknown" });
    [1, 2, 3].forEach((level) => earned.add(level));
    expect(navigation.selectLevel(levels[3])).toMatchObject({
      ok: false,
      reason: "unimplemented",
    });
    expect(navigation.current.id).toBe("1");
  });
  it("requires adjacency even when a distant level is available", () => {
    const { navigation } = setup([1, 2], 1);
    expect(navigation.selectLevel(levels[2])).toMatchObject({
      ok: false,
      reason: "not-adjacent",
    });
    expect(navigation.current.id).toBe("1");
    const route = navigation.checkDestination(levels[1]);
    expect(route).toMatchObject({
      ok: true,
      from: { id: "1", x: 0, y: 0 },
      to: { id: "2", x: 100, y: 200 },
    });
    expect(navigation.current.id).toBe("1");
    expect(navigation.selectLevel(levels[1])).toEqual(route);
    expect(navigation.current.id).toBe("2");
    expect(navigation.selectLevel(levels[2]).ok).toBe(true);
    expect(navigation.current.id).toBe("3");
    expect(navigation.selectLevel(levels[1]).ok).toBe(true);
    expect(navigation.selectLevel(levels[0]).ok).toBe(true);
    expect(navigation.current.id).toBe("1");
  });
  it("allows reopening the current level without awarding completion", () => {
    const { navigation, earned } = setup();
    expect(navigation.selectLevel(levels[0])).toMatchObject({
      ok: true,
      from: { id: "1" },
      to: { id: "1" },
    });
    expect(earned.size).toBe(0);
    expect(navigation.status(levels[1])).toBe("locked");
  });
  it("reads live completion and resets position after progress is cleared", () => {
    const { navigation, earned } = setup([1, 2], 3);
    earned.clear();
    navigation.reset();
    expect(navigation.current.id).toBe("1");
    expect(navigation.status(levels[1])).toBe("locked");
    earned.add(1);
    expect(navigation.status(levels[1])).toBe("current");
    expect(navigation.selectLevel(levels[1]).ok).toBe(true);
  });
});
