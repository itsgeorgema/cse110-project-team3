/**
 * Force data and layout for the free body diagram (#96).
 *
 * Everything here is plain TypeScript with no Konva or DOM, so the layout and
 * the input checks can be unit-tested in Node. ForceRenderer only draws the
 * ArrowLayout values this module returns.
 */

export type CrateSide = "top" | "bottom" | "left" | "right";
export type ArrowPointing = "into" | "away";
export type LabelPosition = "above" | "below" | "left" | "right";
export type DiagramState = "beforeAnswer" | "afterAnswer";
/** Which part of the label text sits on labelAnchor horizontally. */
export type LabelAlign = "left" | "center" | "right";

export interface Force {
  readonly label: string; // e.g. "F_g"
  readonly size?: number; // newtons; required in "afterAnswer"
  readonly side: CrateSide; // which side of the crate the arrow attaches to
  readonly pointing: ArrowPointing; // into: tip touches the side; away: tail touches it
  readonly labelPosition: LabelPosition;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Konva coordinates: origin top-left, y down. */
export interface CrateBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DiagramOptions {
  readonly crate: CrateBox;
  readonly maxArrowLength: number; // longest arrow, in pixels
  /** False draws only the arrows and labels, for a body drawn elsewhere
   *  (the coaster cart, #144); crate then only places them. Defaults to true. */
  readonly drawCrate?: boolean;
}

export interface ArrowLayout {
  readonly tail: Point;
  readonly tip: Point;
  readonly labelText: string; // "F_g = ?" or "F_g = 98.1 N"
  readonly labelAnchor: Point; // beside the arrow's midpoint, or its outer end (see layoutForces)
  readonly labelPosition: LabelPosition;
  readonly labelAlign: LabelAlign;
}

/** No arrow is shorter than 1/3 of the longest: at most a 3× difference. */
export const MIN_LENGTH_RATIO = 1 / 3;
/** Distance in pixels between an arrow's midpoint and its label anchor. */
export const LABEL_GAP = 8;
/** Most decimals shown for a force size after answering. */
export const MAX_DECIMALS = 4;

const SIDES: readonly CrateSide[] = ["top", "bottom", "left", "right"];
const POINTINGS: readonly ArrowPointing[] = ["into", "away"];
const LABEL_POSITIONS: readonly LabelPosition[] = [
  "above",
  "below",
  "left",
  "right",
];

const OUTWARD: Readonly<Record<CrateSide, Point>> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const LABEL_DIRECTION: Readonly<Record<LabelPosition, Point>> = {
  above: { x: 0, y: -1 },
  below: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function describe(force: Force, index: number): string {
  return typeof force.label === "string" && force.label.trim() !== ""
    ? `Force ${index} (${force.label})`
    : `Force ${index}`;
}

function checkOneOf<T>(
  value: T,
  allowed: readonly T[],
  field: string,
  name: string,
): void {
  if (!allowed.includes(value)) {
    throw new TypeError(
      `${name} has an unknown ${field}: ${String(value)}. Use one of: ${allowed.join(", ")}.`,
    );
  }
}

/** Throws with a message naming the force (by index and label) and the problem. */
export function validateForces(
  forces: readonly Force[],
  state: DiagramState,
): void {
  forces.forEach((force, index) => {
    const name = describe(force, index);

    if (typeof force.label !== "string" || force.label.trim() === "") {
      throw new TypeError(`${name} has an empty label.`);
    }
    checkOneOf(force.side, SIDES, "side", name);
    checkOneOf(force.pointing, POINTINGS, "pointing", name);
    checkOneOf(force.labelPosition, LABEL_POSITIONS, "labelPosition", name);

    if (force.size === undefined) {
      if (state === "afterAnswer") {
        throw new RangeError(`${name} needs a size after answering.`);
      }
      return;
    }
    if (typeof force.size !== "number" || !Number.isFinite(force.size)) {
      throw new RangeError(
        `${name} size must be a finite number. Received: ${String(force.size)}`,
      );
    }
    if (force.size <= 0) {
      throw new RangeError(
        `${name} size must be greater than 0. Received: ${force.size}`,
      );
    }
  });
}

function validateOptions(options: DiagramOptions): void {
  const { crate, maxArrowLength } = options;
  const values = { ...crate, maxArrowLength };
  for (const [field, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) {
      throw new RangeError(
        `Diagram option ${field} must be a finite number. Received: ${value}`,
      );
    }
  }
  if (crate.width <= 0 || crate.height <= 0 || maxArrowLength <= 0) {
    throw new RangeError(
      "Diagram crate width, crate height and maxArrowLength must be greater than 0.",
    );
  }
}

/** Rounds to MAX_DECIMALS and drops trailing zeros: 98.10000001 → "98.1". */
export function formatSize(size: number): string {
  const rounded = Number(size.toFixed(MAX_DECIMALS));
  // A tiny positive force must not read as "0", so fall back to significant figures.
  return String(
    rounded !== 0 ? rounded : Number(size.toPrecision(MAX_DECIMALS)),
  );
}

function labelText(force: Force, state: DiagramState): string {
  return state === "beforeAnswer" || force.size === undefined
    ? `${force.label} = ?`
    : `${force.label} = ${formatSize(force.size)} N`;
}

/** The point a fraction (0–1) of the way along a side of the crate. */
function pointOnSide(
  crate: CrateBox,
  side: CrateSide,
  fraction: number,
): Point {
  switch (side) {
    case "top":
      return { x: crate.x + crate.width * fraction, y: crate.y };
    case "bottom":
      return { x: crate.x + crate.width * fraction, y: crate.y + crate.height };
    case "left":
      return { x: crate.x, y: crate.y + crate.height * fraction };
    case "right":
      return { x: crate.x + crate.width, y: crate.y + crate.height * fraction };
  }
}

/** Validates, then returns one ArrowLayout per force, in input order. */
export function layoutForces(
  forces: readonly Force[],
  state: DiagramState,
  options: DiagramOptions,
): readonly ArrowLayout[] {
  validateOptions(options);
  validateForces(forces, state);

  // Sizes are all > 0 after validation, so this never divides by zero.
  const largest = Math.max(...forces.map((force) => force.size ?? 0));
  const perSide = new Map<CrateSide, number>();
  const seenOnSide = new Map<CrateSide, number>();
  for (const force of forces) {
    perSide.set(force.side, (perSide.get(force.side) ?? 0) + 1);
  }

  return forces.map((force) => {
    const slot = seenOnSide.get(force.side) ?? 0;
    seenOnSide.set(force.side, slot + 1);
    const fraction = (slot + 1) / ((perSide.get(force.side) ?? 1) + 1);

    const ratio =
      state === "beforeAnswer"
        ? 1
        : Math.max((force.size ?? largest) / largest, MIN_LENGTH_RATIO);
    const length = options.maxArrowLength * ratio;

    const onSide = pointOnSide(options.crate, force.side, fraction);
    const out = OUTWARD[force.side];
    const offSide = {
      x: onSide.x + out.x * length,
      y: onSide.y + out.y * length,
    };
    const [tail, tip] =
      force.pointing === "away" ? [onSide, offSide] : [offSide, onSide];

    const toLabel = LABEL_DIRECTION[force.labelPosition];
    const middle = { x: (tail.x + tip.x) / 2, y: (tail.y + tip.y) / 2 };
    const outerEnd = force.pointing === "away" ? tip : tail;
    const horizontal = force.side === "left" || force.side === "right";
    const besideHorizontal =
      horizontal &&
      (force.labelPosition === "above" || force.labelPosition === "below");

    // A centred label is wider than a short horizontal arrow and would run onto
    // the crate, so above/below labels line up with the arrow's outer end and
    // extend away from the crate instead.
    const labelAnchor = {
      x: (besideHorizontal ? outerEnd.x : middle.x) + toLabel.x * LABEL_GAP,
      y: middle.y + toLabel.y * LABEL_GAP,
    };
    const labelAlign: LabelAlign = besideHorizontal
      ? force.side === "left"
        ? "right"
        : "left"
      : force.labelPosition === "left"
        ? "right"
        : force.labelPosition === "right"
          ? "left"
          : "center";

    return {
      tail,
      tip,
      labelText: labelText(force, state),
      labelAnchor,
      labelPosition: force.labelPosition,
      labelAlign,
    };
  });
}
