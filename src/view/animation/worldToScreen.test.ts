import { describe, expect, it } from "vitest";
import { fitScale, toRotation, toScreen } from "./worldToScreen.ts";

const yUp = { scale: 10, origin: { x: 20, y: 200 }, yUp: true };
const yDown = { scale: 2, origin: { x: 5, y: 5 }, yUp: false };

describe("toScreen", () => {
  it("puts world (0, 0) at the origin", () => {
    expect(toScreen(yUp, { x: 0, y: 0 })).toEqual({ x: 20, y: 200 });
  });

  it("flips y for a y-up world, so higher is nearer the top of the stage", () => {
    expect(toScreen(yUp, { x: 3, y: 4 })).toEqual({ x: 50, y: 160 });
  });

  it("keeps y for a y-down world such as matter-js frames", () => {
    expect(toScreen(yDown, { x: 3, y: 4 })).toEqual({ x: 11, y: 13 });
  });
});

describe("toRotation", () => {
  it("converts radians to degrees", () => {
    expect(toRotation(yDown, Math.PI / 2)).toBeCloseTo(90, 10);
  });

  it("turns a counterclockwise y-up angle into a clockwise-negative screen rotation", () => {
    expect(toRotation(yUp, Math.PI / 6)).toBeCloseTo(-30, 10);
  });
});

describe("fitScale", () => {
  it("fits the limiting side of the world box", () => {
    expect(
      fitScale({ width: 10, height: 1 }, { width: 400, height: 300 }),
    ).toBe(40);
    expect(
      fitScale({ width: 1, height: 10 }, { width: 400, height: 300 }),
    ).toBe(30);
  });

  it("leaves the margin clear on both sides", () => {
    expect(
      fitScale({ width: 10, height: 1 }, { width: 400, height: 300 }, 50),
    ).toBe(30);
  });

  it("gives 0 on a stage smaller than its margins", () => {
    expect(
      fitScale({ width: 1, height: 1 }, { width: 10, height: 10 }, 20),
    ).toBe(0);
  });

  it.each([0, -1, Number.NaN])("rejects a world box of width %s", (width) => {
    expect(() =>
      fitScale({ width, height: 1 }, { width: 100, height: 100 }),
    ).toThrow(/positive size/);
  });
});
