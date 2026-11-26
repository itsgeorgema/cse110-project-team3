import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type {
  CannonMessage,
  CannonScene,
  CannonView,
} from "./CannonAnimation.ts";

const BARREL_LENGTH = 46;
const BARREL_WIDTH = 18;
const STRIPE_WIDTH = 36;

/**
 * CannonAnimation's tent, cannon, net and trail on the real canvas (Humble
 * Object, #138): it makes no decisions, so it has no unit test;
 * CannonAnimation's tests use a recorder. The ball is a separate KonvaBall.
 */
export class KonvaCannon implements CannonView {
  private readonly layer: Konva.Layer;
  private readonly scene = new Konva.Group();
  private readonly trail: Konva.Line;
  private readonly message: Konva.Label;
  private readonly messageText: Konva.Text;

  constructor(stage: KonvaStage) {
    this.layer = stage.getLayer();
    this.trail = new Konva.Line({
      points: [],
      stroke: "#f4e3b5",
      strokeWidth: 2,
      dash: [6, 6],
      listening: false,
    });
    this.messageText = new Konva.Text({
      fontSize: 16,
      fontStyle: "bold",
      padding: 6,
      fill: "#ffffff",
    });
    this.message = new Konva.Label({ visible: false });
    this.message.add(new Konva.Tag({ cornerRadius: 4 }), this.messageText);
    this.layer.add(this.scene, this.trail, this.message);
  }

  drawScene(scene: CannonScene): void {
    const width = this.layer.getStage().width();
    const height = this.layer.getStage().height();
    this.scene.destroyChildren();

    // Purple striped tent wall behind everything.
    this.scene.add(
      new Konva.Rect({ x: 0, y: 0, width, height, fill: "#4a2a6b" }),
    );
    for (let x = 0; x < width; x += 2 * STRIPE_WIDTH) {
      this.scene.add(
        new Konva.Rect({
          x,
          y: 0,
          width: STRIPE_WIDTH,
          height,
          fill: "#5b3582",
        }),
      );
    }
    // Tent top and the tent wall on the right.
    this.scene.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width,
        height: Math.max(scene.ceilingY, 0),
        fill: "#2e1846",
      }),
      new Konva.Rect({
        x: scene.wallX,
        y: 0,
        width: Math.max(width - scene.wallX, 0),
        height,
        fill: "#2e1846",
      }),
      // Brown floor.
      new Konva.Rect({
        x: 0,
        y: scene.floorY,
        width,
        height: height - scene.floorY,
        fill: "#6b4a2b",
      }),
    );

    // Landing net: a low frame with a mesh across it.
    const netTop = scene.floorY - 10;
    const net = new Konva.Group();
    net.add(
      new Konva.Rect({
        x: scene.netLeftX,
        y: netTop,
        width: scene.netRightX - scene.netLeftX,
        height: 10,
        fill: "rgba(255, 255, 255, 0.18)",
        stroke: "#e8e8f0",
        strokeWidth: 2,
      }),
    );
    for (let x = scene.netLeftX + 6; x < scene.netRightX; x += 6) {
      net.add(
        new Konva.Line({
          points: [x, netTop, x, scene.floorY],
          stroke: "#e8e8f0",
          strokeWidth: 0.75,
        }),
      );
    }
    this.scene.add(net);

    // Red cannon, barrel along the launch angle, with its labels.
    const { x, y } = scene.cannon;
    this.scene.add(
      new Konva.Rect({
        x,
        y,
        offsetY: BARREL_WIDTH / 2,
        offsetX: BARREL_LENGTH - 8,
        width: BARREL_LENGTH,
        height: BARREL_WIDTH,
        cornerRadius: 4,
        fill: "#c8302c",
        rotation: -scene.angleDeg,
      }),
      // Wheel under the middle of the barrel, which slopes back from the mouth.
      new Konva.Circle({
        x: x - (BARREL_LENGTH / 2) * Math.cos((scene.angleDeg * Math.PI) / 180),
        y: scene.floorY - 10,
        radius: 10,
        fill: "#3a2418",
      }),
      new Konva.Arc({
        x,
        y,
        innerRadius: 0,
        outerRadius: 30,
        angle: scene.angleDeg,
        rotation: -scene.angleDeg,
        stroke: "#ffffff",
        strokeWidth: 1,
      }),
      // Up and left of the cannon, clear of the flight path.
      new Konva.Text({
        x: x - 36,
        y: y - 44,
        text: scene.angleLabel,
        fontSize: 14,
        fontStyle: "bold",
        fill: "#ffffff",
      }),
      new Konva.Text({
        x: x - 20,
        y: scene.floorY + 8,
        text: scene.speedLabel,
        fontSize: 12,
        fill: "#ffffff",
      }),
    );
    this.layer.batchDraw();
  }

  drawTrail(points: readonly Vec2[]): void {
    this.trail.points(points.flatMap((p) => [p.x, p.y]));
    this.layer.batchDraw();
  }

  showMessage(message: CannonMessage | undefined): void {
    if (message === undefined) {
      this.message.visible(false);
    } else {
      // Text carries the verdict; the color only repeats it.
      this.messageText.text(message.text);
      this.message.getTag().fill(message.correct ? "#1f6b45" : "#8f2a2a");
      const stageWidth = this.layer.getStage().width();
      this.message.position({
        x: Math.max((stageWidth - this.message.width()) / 2, 8),
        y: 12,
      });
      // Above the ball, which KonvaBall added after this view.
      this.message.moveToTop();
      this.message.visible(true);
    }
    this.layer.batchDraw();
  }
}
