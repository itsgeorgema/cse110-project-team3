import type { LevelAddress } from "../../model/LevelAddress.ts";

/** Map locations reference real configs where available. Remaining circus-preview
 * addresses are upcoming locations and must never be passed to a level factory.
 */
export interface MapNode {
  readonly id: string;
  readonly level: LevelAddress;
  readonly title: string;
  readonly subtitle: string;
  readonly story: string;
  readonly chapter: number;
  readonly x: number;
  readonly y: number;
}

export const chapters = [
  {
    title: "Behind the curtain",
    subtitle: "Every escape starts with a little courage.",
    y: 0,
  },
  {
    title: "After the applause",
    subtitle: "The lights go out. The adventure goes on.",
    y: 650,
  },
  {
    title: "The other side",
    subtitle: "Somewhere beyond the fence, a new beginning.",
    y: 1230,
  },
] as const;

export const previewNodes: readonly MapNode[] = [
  {
    id: "dressing-room",
    level: { gameId: "kinematics", levelId: 1 },
    title: "The getaway car",
    subtitle: "Velocity · Make for the backstage gate",
    story:
      "The last applause fades as you climb into the getaway car. Use the distance to the backstage gate and the travel time to calculate the car’s velocity.",
    chapter: 0,
    x: 240,
    y: 210,
  },
  {
    id: "backstage",
    level: { gameId: "kinematics", levelId: 2 },
    title: "Past the big top",
    subtitle: "Displacement · Put the circus behind you",
    story:
      "The car rolls away from the guards, past striped tents and silent ticket booths. Given its velocity and travel time, work out how far it travels.",
    chapter: 0,
    x: 430,
    y: 380,
  },
  {
    id: "big-top",
    level: { gameId: "kinematics", levelId: 3 },
    title: "Outrun the ringmaster",
    subtitle: "Acceleration · Pick up the pace",
    story:
      "The ringmaster’s guards have spotted your escape. Use the car’s initial velocity, final velocity, and elapsed time to calculate its acceleration.",
    chapter: 0,
    x: 280,
    y: 565,
  },
  {
    id: "midway",
    level: { gameId: "netForce", levelId: 2 },
    title: "The blocked gate",
    subtitle: "Balanced forces · Investigate the crate",
    story:
      "A heavy circus crate rests on the ground beside the exit gate. Before planning your next move, calculate its gravitational force, the ground’s normal force, and the net force.",
    chapter: 1,
    x: 420,
    y: 830,
  },
  {
    id: "wheel",
    level: { gameId: "circus-preview", levelId: 5 },
    title: "The cannon escape",
    subtitle: "Coming soon · Projectile motion",
    story:
      "The human cannonball’s cannon offers a daring route out. Plan a launch over the circus wall by exploring how launch speed and angle shape a projectile’s path.",
    chapter: 1,
    x: 245,
    y: 1030,
  },
  {
    id: "fence",
    level: { gameId: "circus-preview", levelId: 6 },
    title: "The midnight loop",
    subtitle: "Coming soon · Circular motion",
    story:
      "An abandoned roller coaster winds toward the edge of the carnival. Work out the speed needed to carry your car through its loop and keep your escape on track.",
    chapter: 2,
    x: 410,
    y: 1400,
  },
  {
    id: "dawn",
    level: { gameId: "circus-preview", levelId: 7 },
    title: "The final swing",
    subtitle: "Coming soon · Momentum and the trapeze",
    story:
      "One last trapeze swing stands between you and freedom. Explore momentum and time your release for a final leap beyond the circus fence.",
    chapter: 2,
    x: 280,
    y: 1610,
  },
];

export const previewConnections = [
  ["dressing-room", "backstage"],
  ["backstage", "big-top"],
  ["big-top", "midway"],
  ["midway", "wheel"],
  ["wheel", "fence"],
  ["fence", "dawn"],
] as const;
