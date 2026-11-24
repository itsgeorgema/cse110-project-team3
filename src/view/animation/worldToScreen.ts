import type { Vec2 } from "../../model/SimulationState.ts";

/**
 * Where a game's world sits on the stage (part of #115). Frames use world
 * units (meters, or matter-js units) and either y direction; Konva uses
 * pixels, y pointing down, and degrees.
 */
export interface WorldView {
  /** Pixels per world unit. */
  readonly scale: number;
  /** The stage pixel where world (0, 0) is drawn. */
  readonly origin: Vec2;
  /** True when the world's y axis points up, as in physics problems. */
  readonly yUp: boolean;
}

/** Converts a world position to stage pixels. */
export function toScreen(view: WorldView, point: Vec2): Vec2 {
  const ySign = view.yUp ? -1 : 1;
  return {
    x: view.origin.x + point.x * view.scale,
    y: view.origin.y + ySign * point.y * view.scale,
  };
}

/**
 * Converts a frame's angle (radians, counterclockwise in a y-up world) to a
 * Konva rotation (degrees, clockwise on screen).
 */
export function toRotation(view: WorldView, angle: number): number {
  const degrees = (angle * 180) / Math.PI;
  return view.yUp ? -degrees : degrees;
}

/**
 * The largest scale that fits a world box of `width` x `height` units into the
 * stage, leaving `margin` pixels on every side. Throws on a box with no size.
 */
export function fitScale(
  world: { readonly width: number; readonly height: number },
  stage: { readonly width: number; readonly height: number },
  margin = 0,
): number {
  if (!(world.width > 0 && world.height > 0)) {
    throw new RangeError(
      `world box must have a positive size, got ${world.width} x ${world.height}`,
    );
  }
  const usableWidth = Math.max(stage.width - 2 * margin, 0);
  const usableHeight = Math.max(stage.height - 2 * margin, 0);
  return Math.min(usableWidth / world.width, usableHeight / world.height);
}
