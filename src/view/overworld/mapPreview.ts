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
  readonly state: "cleared" | "current" | "locked";
}

export const chapters = [
  { title: "Behind the curtain", subtitle: "Every escape starts with a little courage.", y: 0 },
  { title: "After the applause", subtitle: "The lights go out. The adventure goes on.", y: 650 },
  { title: "The other side", subtitle: "Somewhere beyond the fence, a new beginning.", y: 1230 },
] as const;

export const previewNodes: readonly MapNode[] = [
  { id: "dressing-room", level: { gameId: "circus-preview", levelId: 1 }, title: "The dressing room", subtitle: "A small beginning", story: "One last look in the mirror. One red nose left behind. Tonight, you’re putting on a different kind of show.", chapter: 0, x: 240, y: 210, state: "cleared" },
  { id: "backstage", level: { gameId: "circus-preview", levelId: 2 }, title: "Backstage breakout", subtitle: "Find your momentum", story: "The audience is still cheering. Slip past the props and follow the sliver of moonlight beneath the backstage door.", chapter: 0, x: 430, y: 380, state: "cleared" },
  { id: "big-top", level: { gameId: "circus-preview", levelId: 3 }, title: "Under the big top", subtitle: "A leap of faith", story: "An empty ring. A rope overhead. The only way out is through the place you’ve always called home. Take a breath. This next act is yours.", chapter: 0, x: 280, y: 565, state: "current" },
  { id: "midway", level: { gameId: "circus-preview", levelId: 4 }, title: "Midnight midway", subtitle: "Past the sleeping stalls", story: "The midway has fallen quiet. Between the shuttered stalls, a forgotten trail leads away from the ringmaster’s lights.", chapter: 1, x: 420, y: 830, state: "locked" },
  { id: "wheel", level: { gameId: "circus-preview", levelId: 5 }, title: "The last ride", subtitle: "A different perspective", story: "Above the rooftops, the old wheel turns in the wind. From up there, you might just see a way beyond the circus walls.", chapter: 1, x: 245, y: 1030, state: "locked" },
  { id: "fence", level: { gameId: "circus-preview", levelId: 6 }, title: "Beyond the fence", subtitle: "So close to freedom", story: "The fence is taller than you remember. But you’ve come too far to turn back now. The night is on your side.", chapter: 2, x: 410, y: 1400, state: "locked" },
  { id: "dawn", level: { gameId: "circus-preview", levelId: 7 }, title: "Hello, horizon", subtitle: "Your own next act", story: "The first light spills across an open road. No spotlight. No script. Just you, and a whole world waiting.", chapter: 2, x: 280, y: 1610, state: "locked" },
];

/** Explicit layout graph; no unlock or traversal rules are inferred here. */
export const previewConnections: readonly (readonly [string, string])[] = [
  ["dressing-room", "backstage"], ["backstage", "big-top"],
  ["big-top", "midway"], ["midway", "wheel"],
  ["wheel", "fence"], ["fence", "dawn"],
];
