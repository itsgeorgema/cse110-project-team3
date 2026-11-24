import { describe, expect, it } from "vitest";
import {
  buildKinematicsLevel1Run,
  buildKinematicsLevel2Run,
  buildKinematicsLevel3Run,
} from "../model/runs/kinematicsRun.ts";
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
