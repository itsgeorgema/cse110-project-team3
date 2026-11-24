import type { DiagramOptions, Force } from "./ForceData";

/**
 * Example data shared by the tests and the demo page. Sizes use a 10 kg crate
 * and g = 9.81 m/s^2, so gravity and the normal force are 98.1 N.
 */
export const sampleDiagramOptions: DiagramOptions = {
  crate: { x: 100, y: 100, width: 100, height: 100 },
  maxArrowLength: 80,
};

const gravity: Force = {
  label: "F_g",
  size: 98.1,
  side: "bottom",
  pointing: "away",
  labelPosition: "right",
};

const normal: Force = {
  label: "F_N",
  size: 98.1,
  side: "top",
  pointing: "away",
  labelPosition: "right",
};

/** Net force level 2: a crate resting on the ground. */
export const restingCrateForces: readonly Force[] = [gravity, normal];

/** #18-style level: the clown pushes the crate from the left. */
export const pushedCrateForces: readonly Force[] = [
  gravity,
  normal,
  {
    label: "F_push",
    size: 50,
    side: "left",
    pointing: "into",
    labelPosition: "above",
  },
];

/** A push about 20× smaller than gravity, which shows the 3× length cap. */
export const cappedRatioForces: readonly Force[] = [
  gravity,
  normal,
  {
    label: "F_push",
    size: 5,
    side: "left",
    pointing: "into",
    labelPosition: "above",
  },
];
