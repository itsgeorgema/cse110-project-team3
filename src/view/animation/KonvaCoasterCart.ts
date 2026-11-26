import Konva from "konva";
import type { Vec2 } from "../../model/SimulationState.ts";
import type { KonvaStage } from "../KonvaStage.ts";
import type { CartView } from "./CoasterAnimation.ts";

/**
 * CoasterAnimation's cart on the real canvas, as in the #110 mockup: a white
 * block on two wheels, with no rider (Humble Object, #139). It makes no
 * decisions, so it has no unit test; CoasterAnimation's tests use a recorder.
 * The group's origin is where the wheels touch the track, so turning the
 * group keeps the wheels on the loop. Character art can replace it (#147).
 */
export class KonvaCoasterCart implements CartView {
  private readonly layer: Konva.Layer;
  private readonly cart = new Konva.Group({ visible: false, listening: false });

  constructor(stage: KonvaStage) {
    this.layer = stage.getLayer();
    this.layer.add(this.cart);
    this.setLength(40);
  }

  setLength(length: number): void {
    const wheel = 0.12 * length;
    const height = 0.32 * length;
    this.cart.destroyChildren();
    this.cart.add(
      new Konva.Rect({
        x: -length / 2,
        y: -2 * wheel - height,
        width: length,
        height,
        cornerRadius: 2,
        fill: "#ffffff",
      }),
      ...[-0.3, 0.3].map(
        (at) =>
          new Konva.Circle({
            x: at * length,
            y: -wheel,
            radius: wheel,
            fill: "#d4d4dc",
          }),
      ),
    );
    this.layer.batchDraw();
  }

  moveTo(position: Vec2, rotationDeg: number): void {
    this.cart.position(position);
    this.cart.rotation(rotationDeg);
    this.cart.visible(true);
    this.layer.batchDraw();
  }
}
