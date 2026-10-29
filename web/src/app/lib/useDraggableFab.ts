import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

/** Finger/mouse travel (px) before a press counts as a drag instead of a click. */
const DRAG_THRESHOLD = 5;
/** Closest the button may get to any viewport edge while dragging. */
const EDGE_GAP = 12;

export type FabSide = 'left' | 'right';
interface FabPos { side: FabSide; y: number }

// Positions survive remounts (route/layout changes) for the life of the tab.
const saved = new Map<string, FabPos>();

/**
 * Makes a fixed floating button draggable (mouse, touch, pen). It moves
 * freely while held and snaps to the nearest left/right edge on release,
 * keeping the height where it was dropped. A drag never fires the click.
 *
 * The caller anchors the element at `side` (e.g. `right-4` / `left-4`) and its
 * default bottom offset, applies `style`, and spreads `handleProps` on the
 * part users grab. `y` is always ≤ 0 (only ever lifted above the default
 * spot), so the button can't slide under a bottom nav it was placed above.
 */
export function useDraggableFab<T extends HTMLElement>(key: string) {
  const rootRef = useRef<T>(null);
  const [pos, setPos] = useState<FabPos>(() => saved.get(key) ?? { side: 'right', y: 0 });
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const suppressClick = useRef(false);
  const flipFrom = useRef<number | null>(null);

  const commit = useCallback((next: FabPos) => {
    saved.set(key, next);
    setPos(next);
  }, [key]);

  /** Pulls the element back inside the viewport (e.g. after a panel opens or the window shrinks). */
  const clamp = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < EDGE_GAP) {
      setPos((p) => {
        const next = { ...p, y: Math.min(0, p.y + (EDGE_GAP - r.top)) };
        saved.set(key, next);
        return next;
      });
    }
  }, [key]);

  useEffect(() => {
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [clamp]);

  // Slide (rather than jump) when a drop switches the anchored side.
  useLayoutEffect(() => {
    const el = rootRef.current;
    const from = flipFrom.current;
    flipFrom.current = null;
    if (!el || from === null) return;
    const shift = from - el.getBoundingClientRect().left;
    if (!shift || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [{ transform: `translate(${shift}px, ${pos.y}px)` }, { transform: `translate(0px, ${pos.y}px)` }],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }, [pos]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || !rootRef.current) return;
    const start = { x: e.clientX, y: e.clientY };
    const rect = rootRef.current.getBoundingClientRect();
    const base = pos;
    let moved = false;
    let last = { dx: 0, dy: 0 };

    const onMove = (ev: PointerEvent) => {
      const rawDx = ev.clientX - start.x;
      const rawDy = ev.clientY - start.y;
      if (!moved && Math.hypot(rawDx, rawDy) < DRAG_THRESHOLD) return;
      moved = true;
      ev.preventDefault();
      last = {
        dx: Math.max(EDGE_GAP - rect.left, Math.min(window.innerWidth - EDGE_GAP - rect.right, rawDx)),
        dy: Math.max(EDGE_GAP - rect.top, Math.min(-base.y, rawDy)),
      };
      setDrag(last);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDrag(null);
      if (!moved) return;
      suppressClick.current = true;
      // Released without a click landing on the button (e.g. pointer left it) — clear the guard.
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      const left = rect.left + last.dx;
      const side: FabSide = left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
      if (side !== base.side) flipFrom.current = left;
      commit({ side, y: base.y + last.dy });
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onClickCapture = (e: MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const style: CSSProperties = {
    transform: `translate(${drag?.dx ?? 0}px, ${pos.y + (drag?.dy ?? 0)}px)`,
    transition: drag ? 'none' : 'transform 200ms cubic-bezier(.2,.8,.2,1)',
  };

  return {
    rootRef,
    side: pos.side,
    dragging: !!drag,
    style,
    clamp,
    handleProps: {
      onPointerDown,
      onClickCapture,
      draggable: false,
      style: { touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' } as CSSProperties,
    },
  };
}
