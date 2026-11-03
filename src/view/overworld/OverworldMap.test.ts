import { describe, expect, it } from "vitest";
import { getMapProgress } from "./OverworldMap";
import { previewNodes } from "./mapPreview";

const key = (index: number) => {
  const { gameId, levelId } = previewNodes[index].level;
  return `${gameId}:${levelId}`;
};

describe("getMapProgress", () => {
  it("loads saved completions into the count and sequential map states", () => {
    const progress = getMapProgress(new Set([key(0), key(1), key(3)]));
    expect(progress.completedCount).toBe(3);
    expect(progress.nodes.map((node) => node.state)).toEqual([
      "cleared",
      "cleared",
      "current",
      "cleared",
      "locked",
      "locked",
      "locked",
    ]);
    expect(progress.current.id).toBe("big-top");
  });

  it("starts from the first level when nothing is saved", () => {
    const progress = getMapProgress(new Set());
    expect(progress.completedCount).toBe(0);
    expect(progress.current.id).toBe("dressing-room");
    expect(
      progress.nodes.slice(1).every((node) => node.state === "locked"),
    ).toBe(true);
  });

  it("keeps the last level selected when every level is completed", () => {
    const progress = getMapProgress(
      new Set(previewNodes.map((_, index) => key(index))),
    );
    expect(progress.completedCount).toBe(previewNodes.length);
    expect(progress.current.id).toBe("dawn");
    expect(progress.current.state).toBe("cleared");
  });
});
