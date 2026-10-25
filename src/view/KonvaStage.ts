import Konva from "konva";

/**
 * The only file that imports Konva (Adapter, see #24).
 * Everything else draws through this class, so the canvas library can be
 * swapped or faked in one place.
 */
export class KonvaStage {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;

  constructor(container: HTMLDivElement) {
    this.stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }
}
