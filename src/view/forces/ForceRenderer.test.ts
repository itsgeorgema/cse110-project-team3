import { beforeEach, describe, expect, it, vi } from "vitest";
import Konva from "konva";
import { ForceRenderer } from "./ForceRenderer";
import {
  layoutForces,
  type CrateSide,
  type Force,
  type LabelPosition,
} from "./ForceData";
import {
  pushedCrateForces,
  restingCrateForces,
  sampleDiagramOptions,
} from "./sampleForces";

// Konva needs a real canvas to measure text, which Node doesn't have. These
// fakes record what the renderer asks Konva to draw instead.
vi.mock("konva", () => {
  class FakeShape {
    readonly kind: string;
    readonly attrs: Record<string, unknown>;
    constructor(kind: string, attrs: Record<string, unknown>) {
      this.kind = kind;
      this.attrs = { ...attrs };
    }
  }
  class FakeText extends FakeShape {
    constructor(attrs: Record<string, unknown>) {
      super("Text", attrs);
    }
    // Pretend every character is 7 px wide and a line is 14 px tall.
    width() {
      return String(this.attrs.text).length * 7;
    }
    height() {
      return 14;
    }
    offsetX(value: number) {
      this.attrs.offsetX = value;
    }
    offsetY(value: number) {
      this.attrs.offsetY = value;
    }
  }
  class FakeGroup {
    children: FakeShape[] = [];
    batchDraws = 0;
    add(...nodes: FakeShape[]) {
      this.children.push(...nodes);
    }
    destroyChildren() {
      this.children = [];
    }
    getLayer() {
      return { batchDraw: () => this.batchDraws++ };
    }
  }
  return {
    default: {
      Group: FakeGroup,
      Rect: class extends FakeShape {
        constructor(attrs: Record<string, unknown>) {
          super("Rect", attrs);
        }
      },
      Arrow: class extends FakeShape {
        constructor(attrs: Record<string, unknown>) {
          super("Arrow", attrs);
        }
      },
      Text: FakeText,
    },
  };
});

interface RecordedShape {
  kind: string;
  attrs: Record<string, unknown>;
}
interface RecordingGroup {
  children: RecordedShape[];
  batchDraws: number;
}

/** A fake group, plus the same object typed as the Konva.Group the renderer expects. */
function newGroup(): [RecordingGroup, Konva.Group] {
  const fake = new Konva.Group();
  return [fake as unknown as RecordingGroup, fake];
}

function shapes(group: RecordingGroup, kind: string): RecordedShape[] {
  return group.children.filter((shape) => shape.kind === kind);
}

let group: RecordingGroup;
let renderer: ForceRenderer;

beforeEach(() => {
  const [fake, konvaGroup] = newGroup();
  group = fake;
  renderer = new ForceRenderer(konvaGroup, sampleDiagramOptions);
});

describe("ForceRenderer", () => {
  it("draws the crate, then one arrow and one label per force", () => {
    renderer.render(pushedCrateForces, "afterAnswer");
    const layout = layoutForces(
      pushedCrateForces,
      "afterAnswer",
      sampleDiagramOptions,
    );

    expect(group.children[0].kind).toBe("Rect");
    expect(group.children[0].attrs).toMatchObject(sampleDiagramOptions.crate);
    expect(shapes(group, "Arrow").map((arrow) => arrow.attrs.points)).toEqual(
      layout.map((a) => [a.tail.x, a.tail.y, a.tip.x, a.tip.y]),
    );
    expect(shapes(group, "Text").map((text) => text.attrs.text)).toEqual(
      layout.map((a) => a.labelText),
    );
    expect(group.batchDraws).toBe(1);
  });

  it("draws only the crate for an empty list", () => {
    renderer.render([], "beforeAnswer");
    expect(group.children.map((shape) => shape.kind)).toEqual(["Rect"]);
  });

  it("replaces the drawing when switching from before to after answering", () => {
    renderer.render(restingCrateForces, "beforeAnswer");
    renderer.render(restingCrateForces, "afterAnswer");

    expect(group.children).toHaveLength(1 + 2 * restingCrateForces.length);
    expect(shapes(group, "Text").map((text) => text.attrs.text)).toEqual([
      "F_g = 98.1 N",
      "F_N = 98.1 N",
    ]);
  });

  it("throws on invalid input and leaves the previous drawing intact", () => {
    renderer.render(restingCrateForces, "beforeAnswer");
    const before = [...group.children];

    const bad: Force[] = [{ ...restingCrateForces[0], size: -1 }];
    expect(() => renderer.render(bad, "afterAnswer")).toThrow(RangeError);
    expect(group.children).toEqual(before);
  });

  it("keeps two diagrams independent", () => {
    const [otherGroup, otherKonvaGroup] = newGroup();
    const other = new ForceRenderer(otherKonvaGroup, sampleDiagramOptions);

    renderer.render(restingCrateForces, "beforeAnswer");
    const firstDrawing = [...group.children];
    other.render(pushedCrateForces, "afterAnswer");

    // Drawing the second diagram must not clear or add to the first.
    expect(group.children).toEqual(firstDrawing);
    expect(shapes(group, "Text").map((text) => text.attrs.text)).toEqual([
      "F_g = ?",
      "F_N = ?",
    ]);
    expect(shapes(otherGroup, "Arrow")).toHaveLength(3);
  });

  it.each([
    // "F = ?" is 5 characters: 35 px wide by 14 px tall in the fake.
    ["top", "above", 17.5, 14],
    ["top", "below", 17.5, 0],
    ["top", "left", 35, 7],
    ["top", "right", 0, 7],
    ["left", "above", 35, 14], // right-aligned: extends away from the crate
    ["right", "below", 0, 0], // left-aligned: extends away from the crate
  ] as const)(
    "offsets a %s-side label placed %s as the layout says",
    (side: CrateSide, labelPosition: LabelPosition, offsetX, offsetY) => {
      renderer.render(
        [{ label: "F", side, pointing: "away", labelPosition }],
        "beforeAnswer",
      );
      expect(shapes(group, "Text")[0].attrs).toMatchObject({
        offsetX,
        offsetY,
      });
    },
  );
});
