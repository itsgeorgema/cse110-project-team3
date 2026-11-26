import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type {
  CannonGuide,
  CannonMessage,
  CannonScene,
  CannonTargetScene,
  CannonView,
} from "./CannonAnimation.ts";

const BARREL_LENGTH = 46;
const BARREL_WIDTH = 18;
const STRIPE_WIDTH = 36;
/** Level 3's hanging net is a thin upright frame the ball flies through. */
const TARGET_WIDTH = 10;

/**
 * CannonAnimation's tent, cannon, net and trail on the real canvas (Humble
 * Object, #138, #143): it makes no decisions, so it has no unit test;
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

    if (scene.net !== undefined) this.drawFloorNet(scene, scene.net);
    if (scene.target !== undefined) this.drawTarget(scene.target);

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

  /** Level 1's landing net: a low frame with a mesh across it. */
  private drawFloorNet(
    scene: CannonScene,
    { leftX, rightX }: NonNullable<CannonScene["net"]>,
  ): void {
    const netTop = scene.floorY - 10;
    const net = new Konva.Group();
    net.add(
      new Konva.Rect({
        x: leftX,
        y: netTop,
        width: rightX - leftX,
        height: 10,
        fill: "rgba(255, 255, 255, 0.18)",
        stroke: "#e8e8f0",
        strokeWidth: 2,
      }),
    );
    for (let x = leftX + 6; x < rightX; x += 6) {
      net.add(
        new Konva.Line({
          points: [x, netTop, x, scene.floorY],
          stroke: "#e8e8f0",
          strokeWidth: 0.75,
        }),
      );
    }
    this.scene.add(net);
  }

  /** Level 3's hanging net, with dashed guides for its distance and height. */
  private drawTarget(target: CannonTargetScene): void {
    const guide = (g: CannonGuide) =>
      new Konva.Line({
        points: [g.from.x, g.from.y, g.to.x, g.to.y],
        stroke: "#f4e3b5",
        strokeWidth: 1.5,
        dash: [4, 4],
        opacity: 0.85,
      });
    const label = (text: string, x: number, y: number) =>
      new Konva.Text({ x, y, text, fontSize: 12, fill: "#ffffff" });
    const { horizontal, vertical } = target;
    const stageWidth = this.layer.getStage().width();
    // In the floor band, centered under the horizontal guide.
    const across = label(horizontal.label, 0, horizontal.from.y + 12);
    across.x((horizontal.from.x + horizontal.to.x - across.width()) / 2);
    // Right of the net, level with its center, kept on the stage.
    const up = label(vertical.label, 0, vertical.to.y - 6);
    up.x(
      Math.max(
        Math.min(vertical.to.x + TARGET_WIDTH, stageWidth - up.width() - 4),
        0,
      ),
    );
    this.scene.add(
      guide(horizontal),
      guide(vertical),
      across,
      up,
      new Konva.Rect({
        x: target.x - TARGET_WIDTH / 2,
        y: target.topY,
        width: TARGET_WIDTH,
        height: target.bottomY - target.topY,
        fill: "rgba(255, 255, 255, 0.18)",
        stroke: "#e8e8f0",
        strokeWidth: 2,
      }),
    );
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
