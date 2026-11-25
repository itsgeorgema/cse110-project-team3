import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type { BallView } from "./DemoAnimation.ts";

/**
 * The ball on the real canvas for DemoAnimation and CannonAnimation (Humble
 * Object, #24, #138): it makes no decisions, so it has no unit test; the
 * engines' tests use a recorder.
 */
export class KonvaBall implements BallView {
  private readonly ball: Konva.Circle;

  /** The demo's big yellow ball unless a game passes its own size and color. */
  constructor(
    stage: KonvaStage,
    { radius = 50, fill = "yellow" }: { radius?: number; fill?: string } = {},
  ) {
    const layer = stage.getLayer();
    this.ball = new Konva.Circle({ visible: false, radius, fill });
    layer.add(this.ball);
  }

  moveTo(position: Vec2): void {
    this.ball.position(position);
    this.ball.visible(true);
  }
}
