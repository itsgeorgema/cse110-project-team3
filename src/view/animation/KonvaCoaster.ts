import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import { ForceRenderer } from "../forces/ForceRenderer.ts";
import type {
  CoasterArrow,
  CoasterForces,
  CoasterMessage,
  CoasterScene,
  CoasterView,
} from "./CoasterAnimation.ts";

const STRIPE_WIDTH = 40;
const ARROW_COLOR = "#3fbf6a";
/** Level 2's force arrows: light, so they read on the dark tent. */
const FORCE_COLOR = "#ffffff";

/**
 * CoasterAnimation's tent, loop track, arrow and trail on the real canvas
 * (Humble Object, #139). Level 2's force arrows are ForceRenderer's (#96,
 * #144), without its crate. It makes no decisions, so it has no unit test;
 * CoasterAnimation's tests use a recorder. The cart is KonvaCoasterCart.
 */
export class KonvaCoaster implements CoasterView {
  private readonly layer: Konva.Layer;
  private readonly scene = new Konva.Group({ listening: false });
  private readonly trail: Konva.Line;
  private readonly arrow: Konva.Arrow;
  private readonly arrowLabel: Konva.Text;
  private readonly forces = new Konva.Group({ listening: false });
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
    this.arrow = new Konva.Arrow({
      points: [],
      stroke: ARROW_COLOR,
      fill: ARROW_COLOR,
      strokeWidth: 3,
      pointerLength: 9,
      pointerWidth: 9,
      visible: false,
      listening: false,
    });
    this.arrowLabel = new Konva.Text({
      fontSize: 14,
      fontStyle: "bold",
      fill: "#ffffff",
      visible: false,
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
    this.layer.add(
      this.scene,
      this.trail,
      this.arrow,
      this.arrowLabel,
      this.forces,
      this.message,
    );
  }

  drawScene(scene: CoasterScene): void {
    const width = this.layer.getStage().width();
    const height = this.layer.getStage().height();
    this.scene.destroyChildren();

    // Dark striped tent behind everything, as in the #110 mockup.
    this.scene.add(
      new Konva.Rect({ x: 0, y: 0, width, height, fill: "#1b1530" }),
    );
    for (let x = 0; x < width; x += 2 * STRIPE_WIDTH) {
      this.scene.add(
        new Konva.Rect({
          x,
          y: 0,
          width: STRIPE_WIDTH,
          height,
          fill: "#302449",
        }),
      );
    }
    // Brown floor.
    this.scene.add(
      new Konva.Rect({
        x: 0,
        y: scene.floorY,
        width,
        height: height - scene.floorY,
        fill: "#4f3f2e",
      }),
    );

    // White loop track, with a ramp up to it from each side.
    const { loopBottom: bottom, rampStart, rampEnd } = scene;
    this.scene.add(
      new Konva.Circle({
        x: scene.loopCenter.x,
        y: scene.loopCenter.y,
        radius: scene.loopRadius,
        stroke: "#ffffff",
        strokeWidth: 2,
      }),
      new Konva.Line({
        points: [
          rampStart.x,
          rampStart.y,
          bottom.x,
          bottom.y,
          rampEnd.x,
          rampEnd.y,
        ],
        stroke: "#ffffff",
        strokeWidth: 2,
      }),
      new Konva.Text({
        x: 12,
        y: scene.floorY + 8,
        text: scene.labels.join("   "),
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

  showArrow(arrow: CoasterArrow | undefined): void {
    if (arrow === undefined) {
      this.arrow.visible(false);
      this.arrowLabel.visible(false);
    } else {
      this.arrow.points([arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y]);
      this.arrowLabel.text(arrow.label);
      // Beside the arrow's middle, clear of the cart above it.
      this.arrowLabel.position({
        x: arrow.from.x + 8,
        y: (arrow.from.y + arrow.to.y) / 2 - this.arrowLabel.height() / 2,
      });
      this.arrow.visible(true);
      this.arrowLabel.visible(true);
    }
    this.layer.batchDraw();
  }

  showForces(forces: CoasterForces | undefined): void {
    if (forces === undefined) {
      this.forces.destroyChildren();
      this.forces.visible(false);
    } else {
      // The cart is KonvaCoasterCart's, so only the arrows and labels here.
      new ForceRenderer(
        this.forces,
        {
          crate: forces.cart,
          maxArrowLength: forces.maxArrowLength,
          drawCrate: false,
        },
        { color: FORCE_COLOR },
      ).render(forces.forces, forces.state);
      this.forces.visible(true);
    }
    this.layer.batchDraw();
  }

  showMessage(message: CoasterMessage | undefined): void {
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
        this.messageText.align("center");
      } else {
        // A two-line verdict (Level 2) reads best centred.
        this.messageText.align(message.text.includes("\n") ? "center" : "left");
      }
      this.message.position({
        x: Math.max((stageWidth - this.message.width()) / 2, 8),
        y: 12,
      });
      // Above the cart, which KonvaCoasterCart added after this view.
      this.message.moveToTop();
      this.message.visible(true);
    }
    this.layer.batchDraw();
  }
}
