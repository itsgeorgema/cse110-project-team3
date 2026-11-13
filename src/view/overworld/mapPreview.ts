import type { LevelAddress } from "../../model/LevelAddress.ts";

/** Presentation fixtures only. These addresses are placeholders, not registered levels.
 * Replace the states with ProgressionSystem output when integrating gameplay.
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
  readonly initialState: "cleared" | "current" | "locked";
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
    level: { gameId: "circus-preview", levelId: 1 },
    title: "The dressing room",
    subtitle: "A small beginning",
    story:
      "One last look in the mirror. One red nose left behind. Tonight, you’re putting on a different kind of show.",
    chapter: 0,
    x: 240,
    y: 210,
    initialState: "cleared",
  },
  {
    id: "backstage",
    level: { gameId: "circus-preview", levelId: 2 },
    title: "Backstage breakout",
    subtitle: "The plan takes shape",
    story:
      "Past the props and painted scenery, you find the one thing no one thought to lock away: a way out.",
    chapter: 0,
    x: 430,
    y: 380,
    initialState: "cleared",
  },
  {
    id: "big-top",
    level: { gameId: "circus-preview", levelId: 3 },
    title: "Under the big top",
    subtitle: "The final act begins",
    story:
      "The ring is empty, the spotlights are dark, and the tent flap is only a few brave steps away.",
    chapter: 0,
    x: 280,
    y: 565,
    initialState: "current",
  },
  {
    id: "midway",
    level: { gameId: "circus-preview", levelId: 4 },
    title: "Midnight midway",
    subtitle: "Beyond the bright lights",
    story:
      "The midway sleeps beneath a sky full of stars. Somewhere ahead, the road leaves the circus behind.",
    chapter: 1,
    x: 420,
    y: 830,
    initialState: "locked",
  },
  {
    id: "wheel",
    level: { gameId: "circus-preview", levelId: 5 },
    title: "The quiet wheel",
    subtitle: "A different kind of high",
    story:
      "From the top of the silent Ferris wheel, the whole world seems to wait just beyond the gates.",
    chapter: 1,
    x: 245,
    y: 1030,
    initialState: "locked",
  },
  {
    id: "fence",
    level: { gameId: "circus-preview", levelId: 6 },
    title: "Past the last fence",
    subtitle: "The world opens up",
    story:
      "One final fence stands between the life you knew and the open road. Dawn is close now.",
    chapter: 2,
    x: 410,
    y: 1400,
    initialState: "locked",
  },
  {
    id: "dawn",
    level: { gameId: "circus-preview", levelId: 7 },
    title: "A new day",
    subtitle: "Freedom, at last",
    story:
      "The sun rises over a world with no call time, no painted smile, and no one telling you where to go.",
    chapter: 2,
    x: 280,
    y: 1610,
    initialState: "locked",
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
