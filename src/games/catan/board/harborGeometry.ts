import type { Board, Harbor, HarborType } from '../types';

export interface HarborGeometry {
  id: number;
  type: HarborType;
  x: number;
  y: number;
  /** The two coastal corners the harbour serves: [x1, y1, x2, y2]. */
  ends: [number, number, number, number];
}

/**
 * Where each harbour marker sits: a fixed offset straight out from its own coastal edge. It is not measured from
 * the board centroid, which points the wrong way on this board's non-convex outline.
 */
export function harborGeometry(board: Board, harbors: Harbor[]): HarborGeometry[] {
  const offset = 46;
  return harbors.flatMap((harbor) => {
    const edge = board.edges.find((e) => e.id === harbor.edgeId);
    const v1 = edge && board.vertices.find((v) => v.id === edge.v1);
    const v2 = edge && board.vertices.find((v) => v.id === edge.v2);
    if (!v1 || !v2) return [];
    const mx = (v1.x + v2.x) / 2;
    const my = (v1.y + v2.y) / 2;
    return [
      {
        id: harbor.id,
        type: harbor.type,
        x: mx + Math.cos(harbor.angle) * offset,
        y: my + Math.sin(harbor.angle) * offset,
        ends: [v1.x, v1.y, v2.x, v2.y] as [number, number, number, number],
      },
    ];
  });
}
