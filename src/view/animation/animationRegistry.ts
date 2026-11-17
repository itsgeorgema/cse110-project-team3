import type { AnimationBuilder } from "./AnimationFactory.ts";
import { DemoAnimation } from "./DemoAnimation.ts";
import { browserFrames } from "./FrameScheduler.ts";
import { KonvaBall } from "./KonvaBall.ts";

/**
 * Every game's AnimationEngine, by game id (#24). Adding a game is one new
 * AnimationEngine class plus one line here. Kept apart from AnimationFactory
 * so the factory's tests never load Konva.
 */
export const animationRegistry: Readonly<Record<string, AnimationBuilder>> = {
  demo: (stage) => new DemoAnimation(new KonvaBall(stage), browserFrames),
};
