import Konva from "konva";
import type { DiagramState, Force } from "../forces/ForceData.ts";
import { ForceRenderer } from "../forces/ForceRenderer.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type { CrateMessage, CrateScene, CrateView } from "./CrateAnimation.ts";

/** Light arrows and labels, readable on the night sky and the floor. */
const FORCE_COLOR = "#f4efe6";

/**
 * CrateAnimation's drawing on the real canvas (Humble Object, #140, #141): it makes
 * no decisions, so it has no unit test; CrateAnimation's tests use a recorder.
 * The crate and its arrows are a ForceRenderer diagram (#102) in one group,
 * so moving the group moves the arrows with the crate.
 */
export class KonvaCrate implements CrateView {
  private readonly layer: Konva.Layer;
  private readonly scene = new Konva.Group();
  private readonly crate = new Konva.Group();
  private readonly message: Konva.Label;
  private readonly messageText: Konva.Text;
  private diagram: ForceRenderer | undefined;

  constructor(stage: KonvaStage) {
    this.layer = stage.getLayer();
    this.messageText = new Konva.Text({
      fontSize: 16,
      fontStyle: "bold",
      padding: 6,
      lineHeight: 1.25,
      fill: "#ffffff",
    });
    this.message = new Konva.Label({ visible: false });
    this.message.add(new Konva.Tag({ cornerRadius: 4 }), this.messageText);
    this.layer.add(this.scene, this.crate, this.message);
  }

  drawScene(scene: CrateScene): void {
    const width = this.layer.getStage().width();
    const height = this.layer.getStage().height();
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
      new Konva.Text({
        x: 12,
        y: 12,
        text: scene.label,
        fontSize: 14,
        fontStyle: "bold",
        fill: "#ffffff",
      }),
    );
    const gateHeight = scene.crateSize * 1.8;
    if (scene.finishX !== undefined) {
      this.scene.add(
        new Konva.Line({
          points: [
            scene.finishX,
            scene.groundY - gateHeight,
            scene.finishX,
            scene.groundY,
          ],
          stroke: "#f2c14e",
          strokeWidth: 2,
          dash: [6, 4],
        }),
      );
    }
    if (scene.gateX !== undefined) {
      this.scene.add(
        new Konva.Rect({
          x: scene.gateX + 4,
          y: scene.groundY - gateHeight,
          width: 6,
          height: gateHeight,
          fill: "#e2b77c",
        }),
        // Centered above the post, so it stays on a narrow stage.
        new Konva.Text({
          x: scene.gateX + 7 - 30,
          y: scene.groundY - gateHeight - 18,
          width: 60,
          align: "center",
          text: "Gate",
          fontSize: 13,
          fill: "#e2b77c",
        }),
      );
    }
    this.diagram = new ForceRenderer(
      this.crate,
      {
        crate: { x: 0, y: 0, width: scene.crateSize, height: scene.crateSize },
        maxArrowLength: scene.maxArrowLength,
      },
      { color: FORCE_COLOR },
    );
    this.layer.batchDraw();
  }

  drawForces(forces: readonly Force[], state: DiagramState): void {
    this.diagram?.render(forces, state);
  }

  moveCrate(left: number, top: number): void {
    this.crate.position({ x: left, y: top });
    this.layer.batchDraw();
  }

  showMessage(message: CrateMessage | undefined): void {
    if (message === undefined) {
      this.message.visible(false);
    } else {
      // Text carries the verdict; the color only repeats it.
      this.messageText.text(message.text);
      this.message.getTag().fill(message.correct ? "#1f6b45" : "#8f2a2a");
      const stageWidth = this.layer.getStage().width();
      // Wraps a verdict wider than the stage, as on a phone.
      this.messageText.width("auto");
      this.messageText.align("center");
      if (this.messageText.width() > stageWidth - 16) {
        this.messageText.width(Math.max(stageWidth - 16, 0));
      }
      // Below the level's numbers, above the crate's arrows.
      this.message.position({
        x: Math.max((stageWidth - this.message.width()) / 2, 8),
        y: 38,
      });
      this.message.visible(true);
    }
    this.layer.batchDraw();
  }
}
