import { useRef, useCallback } from 'react';
import type { Camera, Point } from '../utils/math';
import { screenToWorld, clamp } from '../utils/math';

interface ZoomLimits {
  minZoom: number;
  maxZoom: number;
}

export function useCamera(limitsRef: React.RefObject<ZoomLimits>) {
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const subscribersRef = useRef<Set<() => void>>(new Set());

  const notify = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    cameraRef.current.x += dx;
    cameraRef.current.y += dy;
    notify();
  }, [notify]);

  const zoomTo = useCallback(
    (targetZoom: number, focalScreenPoint: Point, viewport: { width: number; height: number }) => {
      const cam = cameraRef.current;
      const { minZoom, maxZoom } = limitsRef.current!;

      // Convert focal screen point to world coords using current camera
      const worldFocal = screenToWorld(focalScreenPoint, cam, viewport);

      // Clamp the new zoom
      const newZoom = clamp(targetZoom, minZoom, maxZoom);

      // Recalculate camera position so the focal world point stays at the same screen position
      cam.x = worldFocal.x - (focalScreenPoint.x - viewport.width / 2) / newZoom;
      cam.y = worldFocal.y - (focalScreenPoint.y - viewport.height / 2) / newZoom;
      cam.zoom = newZoom;

      notify();
    },
    [notify, limitsRef],
  );

  /** Imperatively set camera position + zoom (for debug pane) */
  const setCameraTo = useCallback((x: number, y: number, zoom: number) => {
    const { minZoom, maxZoom } = limitsRef.current!;
    const cam = cameraRef.current;
    cam.x = x;
    cam.y = y;
    cam.zoom = clamp(zoom, minZoom, maxZoom);
    notify();
  }, [notify, limitsRef]);

  const subscribe = useCallback((callback: () => void): (() => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  return { cameraRef, panBy, zoomTo, setCameraTo, subscribe };
}
