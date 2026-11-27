import Konva from "konva";
import type { KonvaStage } from "../KonvaStage.ts";
import type { CarMessage, CarScene, CarView } from "./CarAnimation.ts";

const CAR_WIDTH = 44;
const CAR_HEIGHT = 18;
const WHEEL_RADIUS = 6;

/**
 * CarAnimation's drawing on the real canvas (Humble Object, #116): it makes no
 * decisions, so it has no unit test; CarAnimation's tests use a recorder.
 */
export class KonvaCar implements CarView {
  private readonly layer: Konva.Layer;
  private readonly car: Konva.Group;
  private readonly message: Konva.Label;
  private readonly messageText: Konva.Text;
  private readonly scene = new Konva.Group();
  private groundY = 0;

  constructor(stage: KonvaStage) {
    this.layer = stage.getLayer();
    this.car = new Konva.Group();
    this.car.add(
      new Konva.Rect({
        x: -CAR_WIDTH,
        y: -CAR_HEIGHT - WHEEL_RADIUS,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        cornerRadius: 3,
        fill: "#f2f2f2",
      }),
      new Konva.Circle({
        x: -CAR_WIDTH + 10,
        y: -WHEEL_RADIUS,
        radius: WHEEL_RADIUS,
        fill: "#b8b8c8",
      }),
      new Konva.Circle({
        x: -10,
        y: -WHEEL_RADIUS,
        radius: WHEEL_RADIUS,
        fill: "#b8b8c8",
      }),
    );
    this.messageText = new Konva.Text({
      fontSize: 16,
      fontStyle: "bold",
      padding: 6,
      fill: "#ffffff",
    });
    this.message = new Konva.Label({ visible: false });
    this.message.add(new Konva.Tag({ cornerRadius: 4 }), this.messageText);
    this.layer.add(this.scene, this.car, this.message);
  }

  drawScene(scene: CarScene): void {
    const width = this.layer.getStage().width();
    const height = this.layer.getStage().height();
    this.groundY = scene.groundY;
    this.scene.destroyChildren();
    this.scene.add(
      new Konva.Rect({ x: 0, y: 0, width, height, fill: "#231a3a" }),
      new Konva.Rect({
        x: 0,
        y: scene.groundY,
        width,
        height: height - scene.groundY,
        fill: "#5a4632",
      }),
    );
    if (scene.gateX !== undefined) {
      const bracketY = scene.groundY - 44;
      this.scene.add(
        new Konva.Line({
          points: [
            scene.startX,
            bracketY + 8,
            scene.startX,
            bracketY,
            scene.gateX,
            bracketY,
            scene.gateX,
            bracketY + 8,
          ],
          stroke: "#d8d8e0",
          strokeWidth: 1.5,
        }),
        new Konva.Rect({
          x: scene.gateX - 3,
          y: scene.groundY - 40,
          width: 6,
          height: 40,
          fill: "#e2b77c",
        }),
        new Konva.Text({
          // Centered over the bracket, wide enough never to wrap.
          x: (scene.startX + scene.gateX) / 2 - 120,
          y: bracketY - 20 * scene.label.split("\n").length,
          width: 240,
          align: "center",
          text: scene.label,
          fontSize: 14,
          fontStyle: "bold",
          fill: "#ffffff",
        }),
      );
    }
    this.car.y(scene.groundY);
    this.layer.batchDraw();
  }

  moveCar(x: number): void {
    this.car.position({ x, y: this.groundY });
    this.layer.batchDraw();
  }

  showMessage(message: CarMessage | undefined): void {
    if (message === undefined) {
      this.message.visible(false);
    } else {
      // Text carries the verdict; the color only repeats it.
      this.messageText.text(message.text);
      this.message.getTag().fill(message.correct ? "#1f6b45" : "#8f2a2a");
      // Top of the stage, over the car, so it never covers the track labels.
      const stageWidth = this.layer.getStage().width();
      const x = this.car.x() - CAR_WIDTH / 2 - this.message.width() / 2;
      this.message.position({
        x: Math.min(Math.max(x, 8), stageWidth - this.message.width() - 8),
        y: 12,
      });
      this.message.visible(true);
    }
    this.layer.batchDraw();
  }
}
