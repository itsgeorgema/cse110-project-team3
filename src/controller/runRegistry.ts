import type { LevelAddress } from "../model/LevelAddress.ts";
import { buildCannonLevel1Run } from "../model/runs/cannonRun.ts";
import { buildCircularMotionLevel1Run } from "../model/runs/circularMotionRun.ts";
import {
  buildKinematicsLevel1Run,
  buildKinematicsLevel2Run,
  buildKinematicsLevel3Run,
} from "../model/runs/kinematicsRun.ts";
import type { RunBuilder } from "./GameController.ts";

/**
 * Every level's RunBuilder, by game id and level id (#116). A level listed here
 * plays its answer on the canvas; a level missing here keeps the canvas-free
 * engine. Adding a level is one builder function plus one line here.
 */
export const runRegistry: Readonly<
  Record<string, Readonly<Record<number, RunBuilder>>>
> = {
  kinematics: {
    1: buildKinematicsLevel1Run,
    2: buildKinematicsLevel2Run,
    3: buildKinematicsLevel3Run,
  },
  cannonTrajectory: {
    1: buildCannonLevel1Run,
  },
  circularMotion: {
    1: buildCircularMotionLevel1Run,
  },
};

/** The level's RunBuilder, or undefined when the level has none yet. */
export function runBuilderFor(
  address: LevelAddress,
  registry = runRegistry,
): RunBuilder | undefined {
  if (!Object.hasOwn(registry, address.gameId)) return undefined;
  const levels = registry[address.gameId];
  return Object.hasOwn(levels, address.levelId)
    ? levels[address.levelId]
    : undefined;
}
