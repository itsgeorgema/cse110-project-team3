import { describe, expect, it } from "vitest";
import {
  buildCannonLevel1Run,
  buildCannonLevel2Run,
  buildCannonLevel3Run,
} from "../model/runs/cannonRun.ts";
import {
  buildCircularMotionLevel1Run,
  buildCircularMotionLevel3Run,
} from "../model/runs/circularMotionRun.ts";
import {
  buildKinematicsLevel1Run,
  buildKinematicsLevel2Run,
  buildKinematicsLevel3Run,
} from "../model/runs/kinematicsRun.ts";
import { buildNetForceLevel1Run } from "../model/runs/netForceRun.ts";
import { runBuilderFor } from "./runRegistry.ts";

describe("runBuilderFor", () => {
  it("finds the getaway car's Level 1 run", () => {
    expect(runBuilderFor({ gameId: "kinematics", levelId: 1 })).toBe(
      buildKinematicsLevel1Run,
    );
  });

  it("finds the getaway car's Level 2 and Level 3 runs", () => {
    expect(runBuilderFor({ gameId: "kinematics", levelId: 2 })).toBe(
      buildKinematicsLevel2Run,
    );
    expect(runBuilderFor({ gameId: "kinematics", levelId: 3 })).toBe(
      buildKinematicsLevel3Run,
    );
  });

  it("finds the net force Level 1 run", () => {
    expect(runBuilderFor({ gameId: "netForce", levelId: 1 })).toBe(
      buildNetForceLevel1Run,
    );
  });

  it("finds the cannon's Level 1 run", () => {
    expect(runBuilderFor({ gameId: "cannonTrajectory", levelId: 1 })).toBe(
      buildCannonLevel1Run,
    );
  });

  it("finds the cannon's Level 3 run", () => {
    expect(runBuilderFor({ gameId: "cannonTrajectory", levelId: 3 })).toBe(
      buildCannonLevel3Run,
    );
  });

  it("finds the cannon's Level 2 run", () => {
    expect(runBuilderFor({ gameId: "cannonTrajectory", levelId: 2 })).toBe(
      buildCannonLevel2Run,
    );
  });

  it("finds the circular motion Level 1 and Level 3 runs", () => {
    expect(runBuilderFor({ gameId: "circularMotion", levelId: 1 })).toBe(
      buildCircularMotionLevel1Run,
    );
    expect(runBuilderFor({ gameId: "circularMotion", levelId: 3 })).toBe(
      buildCircularMotionLevel3Run,
    );
  });

  it("has no run for circular motion's Level 2 yet", () => {
    expect(
      runBuilderFor({ gameId: "circularMotion", levelId: 2 }),
    ).toBeUndefined();
  });

  it("returns undefined for a level of a known game that has no run yet", () => {
    expect(runBuilderFor({ gameId: "kinematics", levelId: 4 })).toBeUndefined();
  });

  it("returns undefined for an unknown game", () => {
    expect(runBuilderFor({ gameId: "pinball", levelId: 1 })).toBeUndefined();
  });

  it("ignores names every object inherits", () => {
    expect(
      runBuilderFor({ gameId: "constructor", levelId: 1 }),
    ).toBeUndefined();
    expect(
      runBuilderFor(
        { gameId: "kinematics", levelId: 1 },
        {
          kinematics: {},
        },
      ),
    ).toBeUndefined();
  });
});
