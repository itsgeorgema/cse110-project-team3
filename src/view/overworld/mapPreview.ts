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
    id: "main-gate",
    level: { gameId: "kinematics", levelId: 4 },
    title: "Through the main gate",
    subtitle: "Average velocity · Speed up for the gate",
    story:
      "The gate is just ahead and the car keeps speeding up. Use its starting speed, its acceleration and the time to find its average velocity and the distance to the gate.",
    chapter: 0,
    x: 420,
    y: 620,
  },
  {
    id: "crate-push",
    level: { gameId: "netForce", levelId: 1 },
    title: "Push the crate",
    subtitle: "Newton’s second law · Shove it to the gate",
    story:
      "A heavy circus crate blocks the path to the exit gate. Use its mass and the acceleration you need to work out how hard to push, so the crate slides right up to the gate.",
    chapter: 1,
    x: 480,
    y: 680,
  },
  {
    id: "midway",
    level: { gameId: "netForce", levelId: 2 },
    title: "The blocked gate",
    subtitle: "Balanced forces · Investigate the crate",
    story:
      "The crate now rests on the ground beside the exit gate. Before planning your next move, calculate its gravitational force, the ground’s normal force, and the net force.",
    chapter: 1,
    x: 440,
    y: 890,
  },
  {
    id: "wheel",
    level: { gameId: "cannonTrajectory", levelId: 1 },
    title: "The cannon escape",
    subtitle: "Projectile motion · Aim for the net",
    story:
      "The human cannonball’s cannon offers a daring route out. Split the launch velocity into its horizontal and vertical parts and write how each changes over time, so the flight lands in the safety net.",
    chapter: 1,
    x: 245,
    y: 910,
  },
  {
    id: "mid-flight",
    level: { gameId: "cannonTrajectory", levelId: 2 },
    title: "Caught mid-flight",
    subtitle: "Projectile motion · Find where you are",
    story:
      "Halfway through the flight, a spotlight catches you in the air. Work out your average velocity and how far across and up you have flown at that moment, so the crew knows where to aim the net.",
    chapter: 1,
    x: 120,
    y: 1045,
  },
  {
    id: "tent-roof",
    level: { gameId: "cannonTrajectory", levelId: 3 },
    title: "Through the tent roof",
    subtitle: "Projectile motion · Find the launch speed",
    story:
      "A torn gap in the tent roof is the only way past the guards. The cannon is fixed at 45 degrees, so work out the launch speed that carries the flight through the net hanging below the gap.",
    chapter: 1,
    x: 300,
    y: 1115,
  },
  {
    id: "fence",
    level: { gameId: "circularMotion", levelId: 1 },
    title: "The midnight loop",
    subtitle: "Circular motion · Stay on the track",
    story:
      "An abandoned roller coaster winds toward the edge of the carnival. Work out the cart’s acceleration at the top of the loop, so it stays on the track and carries your escape around.",
    chapter: 2,
    x: 420,
    y: 1340,
  },
  {
    id: "loop-forces",
    level: { gameId: "circularMotion", levelId: 2 },
    title: "Hold on at the top",
    subtitle: "Circular motion · Label the forces",
    story:
      "Upside down at the top of the loop, the cart is held in its circle by gravity and the track. Work out the acceleration, the net force, and the normal and gravitational forces on the cart, so it holds on all the way round.",
    chapter: 2,
    x: 210,
    y: 1470,
  },
  {
    id: "loop-top",
    level: { gameId: "circularMotion", levelId: 3 },
    title: "Over the top",
    subtitle: "Circular motion · Find the minimum speed",
    story:
      "The coaster’s last loop leaves no room for error. At the top, only gravity and the track hold the cart in its circle, so work out the slowest speed that keeps it on the track instead of falling off.",
    chapter: 2,
    x: 390,
    y: 1480,
  },
  {
    id: "dawn",
    level: { gameId: "circus-preview", levelId: 7 },
    title: "The final swing",
    subtitle: "Coming soon · Momentum and the trapeze",
    story:
      "One last trapeze swing stands between you and freedom. Explore momentum and time your release for a final leap beyond the circus fence.",
    chapter: 2,
    x: 330,
    y: 1625,
  },
];

export const previewConnections = [
  ["dressing-room", "backstage"],
  ["backstage", "big-top"],
  ["big-top", "main-gate"],
  ["main-gate", "crate-push"],
  ["crate-push", "midway"],
  ["midway", "wheel"],
  ["wheel", "mid-flight"],
  ["mid-flight", "tent-roof"],
  ["tent-roof", "fence"],
  ["fence", "loop-forces"],
  ["loop-forces", "loop-top"],
  ["loop-top", "dawn"],
] as const;
