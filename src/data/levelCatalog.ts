import type { LevelRegistration } from "../controller/LevelManager.ts";
import { LevelDataConfigFactory } from "./LevelDataConfig.ts";

/** Only implemented factory levels belong here; story-map placeholders do not. */
export function createLevelCatalog(
  factory = new LevelDataConfigFactory(),
): readonly LevelRegistration[] {
  return [
    {
      gameId: "kinematics",
      levelId: 1,
      title: "The getaway car",
      createConfig: () => factory.createLevelDataConfig("kinematics", 1),
    },
    {
      gameId: "kinematics",
      levelId: 2,
      title: "Past the big top",
      createConfig: () => factory.createLevelDataConfig("kinematics", 2),
    },
    {
      gameId: "kinematics",
      levelId: 3,
      title: "Outrun the ringmaster",
      createConfig: () => factory.createLevelDataConfig("kinematics", 3),
    },
    {
      gameId: "netForce",
      levelId: 2,
      title: "The blocked gate",
      createConfig: () => factory.createLevelDataConfig("netForce", 2),
    },
    {
      gameId: "cannonTrajectory",
      levelId: 1,
      title: "The cannon escape",
      createConfig: () => factory.createLevelDataConfig("cannonTrajectory", 1),
    },
    {
      gameId: "cannonTrajectory",
      levelId: 3,
      title: "Through the tent roof",
      createConfig: () => factory.createLevelDataConfig("cannonTrajectory", 3),
    },
    {
      gameId: "circularMotion",
      levelId: 1,
      title: "The midnight loop",
      createConfig: () => factory.createLevelDataConfig("circularMotion", 1),
    },
  ];
}
