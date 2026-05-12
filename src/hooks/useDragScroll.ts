import { useEffect, useRef } from "react";

const DRAG_THRESHOLD_PX = 5;

/**
 * Click-and-drag horizontal scroll. Attach the returned ref + handlers to
 * a horizontally scrolling container; the user can grab anywhere inside
 * and drag to pan, like a Mac trackpad. We swallow the eventual click
 * iff the cursor moved beyond `DRAG_THRESHOLD_PX` so child buttons /
 * cards don't fire a navigation when the user was actually scrolling.
 *
 * Mounts a single window-level mousemove + mouseup so multiple lanes on
 * one page don't fight each other.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  // Drag state lives in refs (no re-renders). `dragOrigin === null` means
  // we are not currently dragging.
  const dragOrigin = useRef<{ x: number; scrollLeft: number } | null>(null);
  // Tracks whether this drag actually moved enough to count as a scroll
  // gesture. Read by the click capture handler to suppress the click.
  const moved = useRef(false);

  const onMouseDown = (e: React.MouseEvent<T>) => {
    if (e.button !== 0) return; // left-click only
    if (!ref.current) return;
    dragOrigin.current = {
      x: e.clientX,
      scrollLeft: ref.current.scrollLeft,
    };
    moved.current = false;
    ref.current.style.cursor = "grabbing";
  };

  const onClickCapture = (e: React.MouseEvent<T>) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const origin = dragOrigin.current;
      if (!origin || !ref.current) return;
      const dx = e.clientX - origin.x;
      if (!moved.current && Math.abs(dx) > DRAG_THRESHOLD_PX) {
        moved.current = true;
      }
      ref.current.scrollLeft = origin.scrollLeft - dx;
    };
    const handleUp = () => {
      if (!dragOrigin.current) return;
      dragOrigin.current = null;
      if (ref.current) {
        ref.current.style.cursor = "grab";
      }
      // Clear `moved` on the next tick so the synthesised click event
      // (which fires after mouseup) still sees `moved=true`.
      window.setTimeout(() => {
        moved.current = false;
      }, 0);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return { ref, onMouseDown, onClickCapture };
}
