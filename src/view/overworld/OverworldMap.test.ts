import { describe, expect, it } from "vitest";
import { OverworldGraph } from "../../model/OverworldGraph.ts";
import { OverworldNavigation } from "../../controller/OverworldNavigation.ts";
import { createLevelCatalog } from "../../data/levelCatalog.ts";
import { previewConnections, previewNodes } from "./mapPreview.ts";

describe("overworld data integration", () => {
  it("binds every implemented level to exactly one location", () => {
    const graph = new OverworldGraph(previewNodes, previewConnections);
    for (const level of createLevelCatalog())
      expect(graph.findLevel(level)).toBeDefined();
    expect(graph.neighbors("dressing-room").map((node) => node.id)).toEqual([
      "backstage",
    ]);
    expect(graph.neighbors("big-top").map((node) => node.id)).toEqual([
      "backstage",
      "midway",
    ]);
  });
  it("does not treat preview saves as real achievements", () => {
    const navigation = new OverworldNavigation(
      new OverworldGraph(previewNodes, previewConnections),
      createLevelCatalog(),
      {
        isCompleted: (level) =>
          level.gameId === "circus-preview" && level.levelId < 3,
      },
    );
    expect(navigation.current.id).toBe("dressing-room");
    expect(previewNodes.map((node) => navigation.status(node.level))).toEqual([
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });
  it("keeps unimplemented locations out of navigation after completing earlier levels", () => {
    const navigation = new OverworldNavigation(
      new OverworldGraph(previewNodes, previewConnections),
      createLevelCatalog(),
      { isCompleted: () => true },
    );
    expect(navigation.current.id).toBe("wheel");
    expect(navigation.selectLevel(previewNodes[5].level)).toMatchObject({
      ok: false,
      reason: "unimplemented",
    });
  });
});
