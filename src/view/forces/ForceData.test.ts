import { describe, expect, it } from "vitest";
import {
  LABEL_GAP,
  MIN_LENGTH_RATIO,
  formatSize,
  layoutForces,
  validateForces,
  type ArrowLayout,
  type CrateSide,
  type DiagramOptions,
  type Force,
  type LabelPosition,
} from "./ForceData";
import {
  cappedRatioForces,
  pushedCrateForces,
  restingCrateForces,
  sampleDiagramOptions,
} from "./sampleForces";

const options = sampleDiagramOptions; // crate (100,100) 100×100, max arrow 80
const max = options.maxArrowLength;

function force(overrides: Partial<Force> = {}): Force {
  return {
    label: "F",
    size: 10,
    side: "top",
    pointing: "away",
    labelPosition: "right",
    ...overrides,
  };
}

function length(arrow: ArrowLayout): number {
  return Math.hypot(arrow.tip.x - arrow.tail.x, arrow.tip.y - arrow.tail.y);
}

describe("validateForces rejections", () => {
  it.each([
    ["an empty label", { label: "" }, TypeError, "Force 0 has an empty label."],
    ["a whitespace-only label", { label: "   " }, TypeError, "empty label"],
    [
      "a negative size",
      { size: -5 },
      RangeError,
      "Force 0 (F) size must be greater than 0. Received: -5",
    ],
    ["a zero size", { size: 0 }, RangeError, "greater than 0. Received: 0"],
    ["a NaN size", { size: NaN }, RangeError, "finite number. Received: NaN"],
    [
      "an infinite size",
      { size: Infinity },
      RangeError,
      "finite number. Received: Infinity",
    ],
    [
      "an unknown side",
      { side: "middle" as CrateSide },
      TypeError,
      "unknown side: middle",
    ],
    [
      "an unknown pointing",
      { pointing: "sideways" as Force["pointing"] },
      TypeError,
      "unknown pointing",
    ],
    [
      "an unknown labelPosition",
      { labelPosition: "inside" as LabelPosition },
      TypeError,
      "unknown labelPosition",
    ],
  ])("refuses %s in either state", (_case, overrides, errorType, message) => {
    for (const state of ["beforeAnswer", "afterAnswer"] as const) {
      const call = () => validateForces([force(overrides)], state);
      expect(call).toThrow(errorType);
      expect(call).toThrow(message);
    }
  });

  it("refuses a missing size after answering, naming the force", () => {
    const forces = [force(), force({ label: "F_g", size: undefined })];
    expect(() => validateForces(forces, "afterAnswer")).toThrow(
      "Force 1 (F_g) needs a size after answering.",
    );
  });

  it("allows a missing size before answering", () => {
    expect(() =>
      validateForces([force({ size: undefined })], "beforeAnswer"),
    ).not.toThrow();
  });

  it.each([
    [
      "crate width 0",
      { ...options, crate: { ...options.crate, width: 0 } },
      "greater than 0",
    ],
    [
      "negative maxArrowLength",
      { ...options, maxArrowLength: -1 },
      "greater than 0",
    ],
    [
      "NaN crate x",
      { ...options, crate: { ...options.crate, x: NaN } },
      "option x must be a finite number",
    ],
  ])(
    "layoutForces refuses %s",
    (_case, badOptions: DiagramOptions, message) => {
      expect(() => layoutForces([force()], "beforeAnswer", badOptions)).toThrow(
        message,
      );
    },
  );
});

describe("layoutForces geometry", () => {
  // One force per side sits at the side's midpoint (fraction 1/2).
  it.each([
    ["top", "away", { x: 150, y: 100 }, { x: 150, y: 20 }],
    ["top", "into", { x: 150, y: 20 }, { x: 150, y: 100 }],
    ["bottom", "away", { x: 150, y: 200 }, { x: 150, y: 280 }],
    ["bottom", "into", { x: 150, y: 280 }, { x: 150, y: 200 }],
    ["left", "away", { x: 100, y: 150 }, { x: 20, y: 150 }],
    ["left", "into", { x: 20, y: 150 }, { x: 100, y: 150 }],
    ["right", "away", { x: 200, y: 150 }, { x: 280, y: 150 }],
    ["right", "into", { x: 280, y: 150 }, { x: 200, y: 150 }],
  ] as const)("%s side, pointing %s", (side, pointing, tail, tip) => {
    const [arrow] = layoutForces(
      [force({ side, pointing })],
      "beforeAnswer",
      options,
    );
    expect(arrow.tail).toEqual(tail);
    expect(arrow.tip).toEqual(tip);
  });

  // Vertical arrow (top side): every label sits beside the midpoint (150, 60).
  it.each([
    ["above", { x: 150, y: 60 - LABEL_GAP }, "center"],
    ["below", { x: 150, y: 60 + LABEL_GAP }, "center"],
    ["left", { x: 150 - LABEL_GAP, y: 60 }, "right"],
    ["right", { x: 150 + LABEL_GAP, y: 60 }, "left"],
  ] as const)(
    "puts the label %s a vertical arrow's midpoint",
    (labelPosition, anchor, labelAlign) => {
      const [arrow] = layoutForces(
        [force({ labelPosition })],
        "beforeAnswer",
        options,
      );
      expect(arrow.labelAnchor).toEqual(anchor);
      expect(arrow.labelPosition).toBe(labelPosition);
      expect(arrow.labelAlign).toBe(labelAlign);
    },
  );

  // Horizontal arrows: above/below labels line up with the outer end and extend
  // away from the crate, so a short arrow's label can't run onto it.
  it.each([
    ["left", "into", "above", { x: 20, y: 150 - LABEL_GAP }, "right"],
    ["left", "away", "below", { x: 20, y: 150 + LABEL_GAP }, "right"],
    ["right", "away", "above", { x: 280, y: 150 - LABEL_GAP }, "left"],
    ["right", "into", "below", { x: 280, y: 150 + LABEL_GAP }, "left"],
    ["left", "into", "left", { x: 60 - LABEL_GAP, y: 150 }, "right"],
    ["right", "away", "right", { x: 240 + LABEL_GAP, y: 150 }, "left"],
  ] as const)(
    "%s side, pointing %s, label %s",
    (side, pointing, labelPosition, anchor, labelAlign) => {
      const [arrow] = layoutForces(
        [force({ side, pointing, labelPosition })],
        "beforeAnswer",
        options,
      );
      expect(arrow.labelAnchor).toEqual(anchor);
      expect(arrow.labelAlign).toBe(labelAlign);
    },
  );

  it("keeps a short horizontal arrow's above label off the crate", () => {
    const [push] = layoutForces(
      [
        force({
          side: "left",
          pointing: "into",
          labelPosition: "above",
          size: 1,
        }),
        force({ size: 100 }),
      ],
      "afterAnswer",
      options,
    );
    // Right-aligned at the outer end, so the text ends left of the crate (x = 100).
    expect(push.labelAlign).toBe("right");
    expect(push.labelAnchor.x).toBeLessThan(options.crate.x);
  });

  it("spaces several forces on one side evenly, in input order", () => {
    const arrows = layoutForces(
      [
        force({ side: "left" }),
        force({ side: "top" }),
        force({ side: "left" }),
        force({ side: "left" }),
      ],
      "beforeAnswer",
      options,
    );
    expect(arrows.map((arrow) => arrow.tail.y)).toEqual([125, 100, 150, 175]);
    expect(arrows[1].tail.x).toBe(150); // alone on top: still centred
  });

  it("draws only the crate's arrows for an empty list", () => {
    expect(layoutForces([], "afterAnswer", options)).toEqual([]);
  });
});

describe("layoutForces lengths", () => {
  it("draws every arrow full length before answering, whatever the sizes", () => {
    const arrows = layoutForces(cappedRatioForces, "beforeAnswer", options);
    expect(arrows.map(length)).toEqual([max, max, max]);
  });

  it("scales arrows to their sizes after answering", () => {
    const arrows = layoutForces(
      [force({ size: 100 }), force({ size: 50, side: "left" })],
      "afterAnswer",
      options,
    );
    expect(arrows.map(length)).toEqual([max, max / 2]);
  });

  it("caps a 100× ratio at 3×", () => {
    const arrows = layoutForces(
      [force({ size: 100 }), force({ size: 1, side: "left" })],
      "afterAnswer",
      options,
    );
    expect(length(arrows[0])).toBe(max);
    expect(length(arrows[1])).toBeCloseTo(max * MIN_LENGTH_RATIO);
  });

  it("keeps a ratio just inside the cap to scale", () => {
    const arrows = layoutForces(
      [force({ size: 100 }), force({ size: 34, side: "left" })],
      "afterAnswer",
      options,
    );
    expect(length(arrows[1])).toBeCloseTo(max * 0.34);
  });

  it("draws a single force full length, however small", () => {
    const [arrow] = layoutForces(
      [force({ size: 0.001 })],
      "afterAnswer",
      options,
    );
    expect(length(arrow)).toBe(max);
  });
});

describe("labels never give the answer away before answering", () => {
  it.each([
    ["resting crate", restingCrateForces],
    ["pushed crate", pushedCrateForces],
  ])("%s: labels are exactly 'label = ?' with no digits", (_case, forces) => {
    const arrows = layoutForces(forces, "beforeAnswer", options);
    expect(arrows.map((arrow) => arrow.labelText)).toEqual(
      forces.map((f) => `${f.label} = ?`),
    );
    for (const arrow of arrows) expect(arrow.labelText).not.toMatch(/\d/);
  });

  it("shows values with units after answering", () => {
    const arrows = layoutForces(pushedCrateForces, "afterAnswer", options);
    expect(arrows.map((arrow) => arrow.labelText)).toEqual([
      "F_g = 98.1 N",
      "F_N = 98.1 N",
      "F_push = 50 N",
    ]);
  });
});

describe("formatSize", () => {
  it.each([
    [98.10000000000001, "98.1"],
    [186.39000000000001, "186.39"],
    [1.23456, "1.2346"],
    [50, "50"],
    [0.00001, "0.00001"], // would round to "0" at 4 decimals
  ])("formats %d as %s", (size, expected) => {
    expect(formatSize(size)).toBe(expected);
  });
});
