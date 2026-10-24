import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { MAP_HEIGHT, MAP_WIDTH } from '../data/stations';

interface Camera {
  x: number;
  y: number;
  /** Width of the visible part of the map; the height follows the map's aspect ratio. */
  w: number;
}

const FULL: Camera = { x: 0, y: 0, w: MAP_WIDTH };
const MAX_ZOOM = 5;
const DRAG_SLOP = 6;
const ASPECT = MAP_HEIGHT / MAP_WIDTH;

function clamp(c: Camera): Camera {
  const w = Math.min(MAP_WIDTH, Math.max(MAP_WIDTH / MAX_ZOOM, c.w));
  const h = w * ASPECT;
  return { w, x: Math.min(MAP_WIDTH - w, Math.max(0, c.x)), y: Math.min(MAP_HEIGHT - h, Math.max(0, c.y)) };
}

interface Point {
  x: number;
  y: number;
}

/**
 * Zoom and pan for the map: wheel / pinch / buttons zoom, dragging pans. A drag never counts as a station tap
 * (`wasDragged`), so panning on a phone can't move a detective by accident.
 */
export function useMapCamera(svgRef: RefObject<SVGSVGElement>) {
  const [camera, setCamera] = useState<Camera>(FULL);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const pointers = useRef(new Map<number, Point>());
  const dragged = useRef(false);
  const travelled = useRef(0);

  /** Pixels on screen → map units, and the map point under a client position. */
  const geometry = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    const cam = cameraRef.current;
    const unit = Math.max(cam.w / rect.width, (cam.w * ASPECT) / rect.height);
    const offsetX = (rect.width - cam.w / unit) / 2;
    const offsetY = (rect.height - (cam.w * ASPECT) / unit) / 2;
    const at = (clientX: number, clientY: number): Point => ({ x: cam.x + (clientX - rect.left - offsetX) * unit, y: cam.y + (clientY - rect.top - offsetY) * unit });
    return { unit, at };
  }, [svgRef]);

  /** Zoom by `factor` keeping the map point at (px, py) under the same screen spot. */
  const zoomAround = useCallback((factor: number, px: number, py: number) => {
    setCamera((c) => {
      const w = Math.min(MAP_WIDTH, Math.max(MAP_WIDTH / MAX_ZOOM, c.w / factor));
      const k = w / c.w;
      return clamp({ w, x: px - (px - c.x) * k, y: py - (py - c.y) * k });
    });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const c = cameraRef.current;
      zoomAround(factor, c.x + c.w / 2, c.y + (c.w * ASPECT) / 2);
    },
    [zoomAround],
  );

  const reset = useCallback(() => setCamera(FULL), []);

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    // Listen on the wrapper around the map so the wheel also works over the layers stacked on top of the svg.
    const svg = (svgRef.current?.parentElement ?? svgRef.current) as HTMLElement | null;
    if (!svg) return;
    function onWheel(e: WheelEvent) {
      const g = geometry();
      if (!g) return;
      e.preventDefault();
      const p = g.at(e.clientX, e.clientY);
      zoomAround(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [svgRef, geometry, zoomAround]);

  function onPointerDown(e: ReactPointerEvent<Element>) {
    if (pointers.current.size === 0) {
      dragged.current = false;
      travelled.current = 0;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: ReactPointerEvent<Element>) {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const g = geometry();
    if (!g) return;
    const next = { x: e.clientX, y: e.clientY };
    const all = [...pointers.current.entries()];

    if (all.length >= 2) {
      const other = all.find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(next.x - other.x, next.y - other.y);
        const mid = g.at((next.x + other.x) / 2, (next.y + other.y) / 2);
        const pan = { x: ((next.x - previous.x) / 2) * g.unit, y: ((next.y - previous.y) / 2) * g.unit };
        if (before > 0 && after > 0) zoomAround(after / before, mid.x, mid.y);
        setCamera((c) => clamp({ ...c, x: c.x - pan.x, y: c.y - pan.y }));
        dragged.current = true;
      }
    } else {
      travelled.current += Math.hypot(next.x - previous.x, next.y - previous.y);
      if (travelled.current > DRAG_SLOP) {
        dragged.current = true;
        setCamera((c) => clamp({ ...c, x: c.x - (next.x - previous.x) * g.unit, y: c.y - (next.y - previous.y) * g.unit }));
      }
    }
    pointers.current.set(e.pointerId, next);
  }

  function onPointerEnd(e: ReactPointerEvent<Element>) {
    pointers.current.delete(e.pointerId);
  }

  return {
    camera,
    /** Screen pixel → map unit helpers for the current view (used by the magnifier). */
    geometry,
    zoomed: camera.w < MAP_WIDTH,
    zoomBy,
    reset,
    wasDragged: () => dragged.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onPointerLeave: onPointerEnd },
  };
}
