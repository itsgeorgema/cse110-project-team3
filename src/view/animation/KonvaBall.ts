import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type { BallView } from "./DemoAnimation.ts";

/**
 * DemoAnimation's ball on the real canvas (Humble Object, #24): it makes no
 * decisions, so it has no unit test; DemoAnimation's tests use a recorder.
 */
export class KonvaBall implements BallView {
  private readonly ball: Konva.Circle;

  constructor(stage: KonvaStage) {
    const layer = stage.getLayer();
    this.ball = new Konva.Circle({
      visible: false,
      radius: 50,
      fill: "yellow",
    });
    layer.add(this.ball);
  }

  moveTo(position: Vec2): void {
    this.ball.position(position);
    this.ball.visible(true);
  }
}
