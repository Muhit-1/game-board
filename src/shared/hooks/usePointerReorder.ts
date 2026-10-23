import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

interface DragState {
  id: number;
  startY: number;
  startCenter: number;
  dy: number;
  /** Index the dragged item would land at among the other items. */
  target: number;
}

export interface ReorderHandleProps {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Drag-to-reorder for a vertical list of cards: pointer drag on a handle (works with touch) or ArrowUp/ArrowDown on
 * the focused handle. `ids` is the current order; `onMove(id, toIndex)` is called with the item's new index.
 */
export function usePointerReorder(ids: number[], onMove: (id: number, toIndex: number) => void) {
  const elements = useRef(new Map<number, HTMLElement | null>());
  const [drag, setDrag] = useState<DragState | null>(null);

  const centerOf = (id: number) => {
    const rect = elements.current.get(id)?.getBoundingClientRect();
    return rect ? rect.top + rect.height / 2 : 0;
  };
  const targetFor = (id: number, y: number) => ids.filter((other) => other !== id && centerOf(other) < y).length;

  /** Ref callback for each card's element. */
  const register = (id: number) => (el: HTMLElement | null) => {
    elements.current.set(id, el);
  };

  const handleProps = (id: number): ReorderHandleProps => ({
    onPointerDown: (e) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture only keeps move events flowing outside the handle; dragging still works without it.
      }
      setDrag({ id, startY: e.clientY, startCenter: centerOf(id), dy: 0, target: ids.indexOf(id) });
    },
    onPointerMove: (e) => {
      if (!drag || drag.id !== id) return;
      const dy = e.clientY - drag.startY;
      setDrag({ ...drag, dy, target: targetFor(id, drag.startCenter + dy) });
    },
    onPointerUp: () => {
      if (drag && drag.id === id && drag.target !== ids.indexOf(id)) onMove(id, drag.target);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      onMove(id, ids.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1));
    },
  });

  return { drag, register, handleProps };
}
