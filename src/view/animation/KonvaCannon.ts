import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type {
  CannonGuide,
  CannonMessage,
  CannonPauseScene,
  CannonScene,
  CannonTargetScene,
  CannonView,
} from "./CannonAnimation.ts";

const BARREL_LENGTH = 46;
const BARREL_WIDTH = 18;
const STRIPE_WIDTH = 36;
/** Level 3's hanging net is a thin upright frame the ball flies through. */
const TARGET_WIDTH = 10;
/** Level 2's marker for the player's point: a ring a little wider than the ball. */
const GUESS_RADIUS = 13;

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
    if (scene.pause !== undefined) this.drawPause(scene, scene.pause);

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

  /**
   * Level 2's pause: Δx along the floor, Δy up to the ball, the time above
   * it, and the player's point and average-velocity line in gold.
   */
  private drawPause(scene: CannonScene, pause: CannonPauseScene): void {
    const { horizontal, vertical } = pause;
    const stageWidth = this.layer.getStage().width();
    const keepOnStage = (text: Konva.Text, x: number) =>
      text.x(Math.max(Math.min(x, stageWidth - text.width() - 4), 0));

    if (pause.average !== undefined) {
      const average = pause.average;
      const line = guide(average);
      line.stroke("#f2c14e");
      line.dash([2, 5]);
      const words = label(average.label, 0, 0);
      words.fill("#f2c14e");
      // Above the middle of the line, so it stays clear of the floor.
      words.y((average.from.y + average.to.y) / 2 - 20);
      keepOnStage(words, (average.from.x + average.to.x) / 2 - words.width());
      this.scene.add(line, words);
    }

    const across = label(horizontal.label, 0, horizontal.from.y + 12);
    across.fontSize(14);
    across.fontStyle("bold");
    keepOnStage(
      across,
      (horizontal.from.x + horizontal.to.x - across.width()) / 2,
    );
    const up = label(vertical.label, 0, (vertical.from.y + vertical.to.y) / 2);
    up.fontSize(14);
    up.fontStyle("bold");
    // Left of the line: a wrong point is most often right of the ball.
    keepOnStage(up, vertical.to.x - up.width() - 6);
    // Up and left of the ball, clear of a marker above or right of it.
    const time = label(pause.timeLabel, 0, pause.ball.y - 26);
    keepOnStage(time, pause.ball.x - time.width() - 10);
    this.scene.add(guide(horizontal), guide(vertical), across, up, time);

    if (pause.guess !== undefined) {
      const x = pause.guess.x;
      // A point kept at the tent top shows whole, below it.
      const y = Math.max(pause.guess.y, scene.ceilingY + GUESS_RADIUS);
      const arm = GUESS_RADIUS + 4;
      // Right of the marker, clear of the Δy label on the line's left.
      const words = label("Your Δx, Δy", 0, y - 6);
      words.fill("#f2c14e");
      keepOnStage(words, x + arm + 2);
      this.scene.add(
        new Konva.Circle({
          x,
          y,
          radius: GUESS_RADIUS,
          stroke: "#f2c14e",
          strokeWidth: 2,
        }),
        new Konva.Line({
          points: [x - arm, y, x + arm, y],
          stroke: "#f2c14e",
          strokeWidth: 1,
        }),
        new Konva.Line({
          points: [x, y - arm, x, y + arm],
          stroke: "#f2c14e",
          strokeWidth: 1,
        }),
        words,
      );
    }
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
      // Wraps a verdict wider than the stage, as on a phone.
      this.messageText.width("auto");
      if (this.messageText.width() > stageWidth - 16) {
        this.messageText.width(Math.max(stageWidth - 16, 0));
      }
      this.messageText.align("center");
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

/** A dashed guide line, e.g. Level 3's distances or Level 2's Δx and Δy. */
function guide(g: CannonGuide): Konva.Line {
  return new Konva.Line({
    points: [g.from.x, g.from.y, g.to.x, g.to.y],
    stroke: "#f4e3b5",
    strokeWidth: 1.5,
    dash: [4, 4],
    opacity: 0.85,
  });
}

function label(text: string, x: number, y: number): Konva.Text {
  return new Konva.Text({ x, y, text, fontSize: 12, fill: "#ffffff" });
}
