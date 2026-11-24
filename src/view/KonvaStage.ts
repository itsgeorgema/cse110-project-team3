import Konva from "konva";

/**
 * Konva is only imported under src/view/ (shared owner, see #24).
 * View classes receive the stage directly from main.ts, allowing for:
 * - main.ts to be Konva-free
 * - management of a single stage per page
 * - centralized control over the scene lifecycle
 */
export class KonvaStage {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly container: HTMLDivElement;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }

  getLayer(): Konva.Layer {
    return this.layer;
  }

  /** The stage size in pixels. */
  get size(): { readonly width: number; readonly height: number } {
    return { width: this.stage.width(), height: this.stage.height() };
  }

  /**
   * Empties the stage for the next level (#116) and matches it to the
   * container's current size, which is only known once the container is shown.
   */
  reset(): void {
    this.layer.destroyChildren();
    this.stage.size({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    });
    this.layer.batchDraw();
  }
}
