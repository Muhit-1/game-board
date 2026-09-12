import type { Point } from '../types';

/** Hex circumradius in local board units. The SVG viewBox scales this to fit the viewport. */
export const HEX_SIZE = 60;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const ROW_SPACING_Y = 1.5 * HEX_SIZE;

/** The 5–6 player expansion board: 7 rows, widest in the middle. */
export const ROW_LAYOUT = [3, 4, 5, 6, 5, 4, 3];

export function hexCenter(row: number, col: number): Point {
  const count = ROW_LAYOUT[row];
  const x = (col - (count - 1) / 2) * HEX_WIDTH;
  const y = row * ROW_SPACING_Y;
  return { x, y };
}

/** Pointy-top hex corners, matching the clip-path shape used in the theme reference sheets. */
export function hexCorners(center: Point): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return {
      x: center.x + HEX_SIZE * Math.cos(angle),
      y: center.y + HEX_SIZE * Math.sin(angle),
    };
  });
}

/** Dedupe key for a point shared by multiple hex corners (floating point safe). */
export function pointKey(p: Point): string {
  return `${Math.round(p.x * 100)}:${Math.round(p.y * 100)}`;
}
