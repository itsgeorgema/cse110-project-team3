import Konva from "konva";
import {
  layoutForces,
  type DiagramOptions,
  type DiagramState,
  type ArrowLayout,
  type Force,
} from "./ForceData";

const CRATE_FILL = "#bd7653";
const CRATE_STROKE = "#5a3523";
const ARROW_COLOR = "#162c34";
const LABEL_FONT_SIZE = 14;

/**
 * Draws a free body diagram into a Konva Group it is given (#96).
 *
 * All layout decisions come from layoutForces; this class only turns them into
 * Konva shapes. It never touches the Stage, so several diagrams can share one
 * Stage by each drawing into their own Group.
 */
export class ForceRenderer {
  private readonly group: Konva.Group;
  private readonly options: DiagramOptions;

  constructor(group: Konva.Group, options: DiagramOptions) {
    this.group = group;
    this.options = options;
  }

  /** Lays out first, so invalid input throws and leaves the previous drawing intact.
   *  Then clears only its own group and draws the crate, arrows and labels. */
  render(forces: readonly Force[], state: DiagramState): void {
    const arrows = layoutForces(forces, state, this.options);

    this.group.destroyChildren();
    const { crate } = this.options;
    this.group.add(
      new Konva.Rect({
        ...crate,
        fill: CRATE_FILL,
        stroke: CRATE_STROKE,
        strokeWidth: 2,
      }),
    );

    for (const arrow of arrows) {
      this.group.add(
        new Konva.Arrow({
          points: [arrow.tail.x, arrow.tail.y, arrow.tip.x, arrow.tip.y],
          stroke: ARROW_COLOR,
          fill: ARROW_COLOR,
          strokeWidth: 3,
          pointerLength: 10,
          pointerWidth: 10,
        }),
      );

      const label = new Konva.Text({
        x: arrow.labelAnchor.x,
        y: arrow.labelAnchor.y,
        text: arrow.labelText,
        fontSize: LABEL_FONT_SIZE,
        fill: ARROW_COLOR,
      });
      alignLabel(label, arrow);
      this.group.add(label);
    }

    this.group.getLayer()?.batchDraw();
  }
}

/** Positions the text on its anchor as ForceData says: labelAlign sets the
 *  horizontal edge, labelPosition sets whether it sits above, below or level. */
function alignLabel(label: Konva.Text, arrow: ArrowLayout): void {
  const width = label.width();
  const height = label.height();
  const offsetX = { left: 0, center: width / 2, right: width };
  const offsetY = {
    above: height,
    below: 0,
    left: height / 2,
    right: height / 2,
  };
  label.offsetX(offsetX[arrow.labelAlign]);
  label.offsetY(offsetY[arrow.labelPosition]);
}
