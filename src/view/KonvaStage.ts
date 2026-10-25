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
