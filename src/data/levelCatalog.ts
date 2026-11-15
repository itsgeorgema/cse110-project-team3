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
      title: "Getaway vehicle: velocity",
      createConfig: () => factory.createLevelDataConfig("kinematics", 1),
    },
    {
      gameId: "kinematics",
      levelId: 2,
      title: "Getaway vehicle: displacement",
      createConfig: () => factory.createLevelDataConfig("kinematics", 2),
    },
    {
      gameId: "kinematics",
      levelId: 3,
      title: "Getaway vehicle: acceleration",
      createConfig: () => factory.createLevelDataConfig("kinematics", 3),
    },
    {
      gameId: "netForce",
      levelId: 2,
      title: "Blocked gate: balanced forces",
      createConfig: () => factory.createLevelDataConfig("netForce", 2),
    },
  ];
}
