import type { Board } from '../types';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Board extent plus room for the harbours; the board SVG, the sea bitmap and the Classic frame all share it. */
export function computeViewBox(board: Board, pad = 74): ViewBox {
  const xs = board.vertices.map((v) => v.x);
  const ys = board.vertices.map((v) => v.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/** The Classic board's water frame: a hexagon with points left and right, inscribed in the view box. */
export function frameCorners(v: ViewBox, inset = 5): [number, number][] {
  const x0 = v.x + inset;
  const x1 = v.x + v.w - inset;
  const y0 = v.y + inset;
  const y1 = v.y + v.h - inset;
  const cy = (y0 + y1) / 2;
  const q = (x1 - x0) / 4;
  return [
    [x0, cy],
    [x0 + q, y0],
    [x1 - q, y0],
    [x1, cy],
    [x1 - q, y1],
    [x0 + q, y1],
  ];
}
