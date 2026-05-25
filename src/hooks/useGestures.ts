import { useEffect, useRef } from 'react';
import type { Camera, Point } from '../utils/math';

/** The camera API surface we depend on (from useCamera). */
interface CameraAPI {
  cameraRef: React.RefObject<Camera>;
  panBy: (dx: number, dy: number) => void;
  zoomTo: (newZoom: number, screenFocus: Point, viewport: { width: number; height: number }) => void;
  subscribe: (cb: () => void) => () => void;
}

/**
 * Attaches wheel-zoom, drag-pan, and keyboard navigation listeners
 * to the given container element.
 */
export function useGestures(
  containerRef: React.RefObject<HTMLElement | null>,
  camera: CameraAPI,
): void {
  const isDragging = useRef(false);
  const lastPointerPos = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const { cameraRef, panBy, zoomTo } = camera;

    // Skip gesture handling for clicks/scrolls inside UI overlays
    const isUI = (e: Event) =>
      (e.target as HTMLElement)?.closest?.('[data-no-drag]') != null;

    // ── Wheel zoom (+ trackpad pinch) ──────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (isUI(e)) return;
      e.preventDefault();

      const isPinch = e.ctrlKey; // browsers set ctrlKey for pinch gestures
      const factor = isPinch
        ? 1 - e.deltaY * 0.01
        : e.deltaY > 0
          ? 0.92
          : 1.08;

      zoomTo(
        cameraRef.current!.zoom * factor,
        { x: e.clientX, y: e.clientY },
        { width: window.innerWidth, height: window.innerHeight },
      );
    };

    // ── Drag pan ───────────────────────────────────────────────────
    const onPointerDown = (e: PointerEvent) => {
      if (isUI(e)) return;
      isDragging.current = true;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const zoom = cameraRef.current!.zoom;
      const dx = (e.clientX - lastPointerPos.current.x) / zoom;
      const dy = (e.clientY - lastPointerPos.current.y) / zoom;

      panBy(-dx, -dy);

      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.releasePointerCapture(e.pointerId);
    };

    // ── Keyboard navigation ────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const zoom = cameraRef.current!.zoom;
      const step = 30 / zoom;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const center: Point = { x: viewport.width / 2, y: viewport.height / 2 };

      switch (e.key) {
        case 'ArrowLeft':
          panBy(-step, 0);
          break;
        case 'ArrowRight':
          panBy(step, 0);
          break;
        case 'ArrowUp':
          panBy(0, -step);
          break;
        case 'ArrowDown':
          panBy(0, step);
          break;
        case '+':
        case '=':
          zoomTo(cameraRef.current!.zoom * 1.2, center, viewport);
          break;
        case '-':
          zoomTo(cameraRef.current!.zoom / 1.2, center, viewport);
          break;
        case 'Escape':
          // Reserved for zoom-out / deselect (future)
          break;
        default:
          return; // don't preventDefault for unhandled keys
      }

      e.preventDefault();
    };

    // ── Attach listeners ───────────────────────────────────────────
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef, camera]);
}
