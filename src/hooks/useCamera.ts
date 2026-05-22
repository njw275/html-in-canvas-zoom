import { useRef, useCallback } from 'react';
import { Camera, Point, screenToWorld, clamp } from '../utils/math';

const MIN_ZOOM = 0.0001;
const MAX_ZOOM = 100000;

export function useCamera() {
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

      // Convert focal screen point to world coords using current camera
      const worldFocal = screenToWorld(focalScreenPoint, cam, viewport);

      // Clamp the new zoom
      const newZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);

      // Recalculate camera position so the focal world point stays at the same screen position
      cam.x = worldFocal.x - (focalScreenPoint.x - viewport.width / 2) / newZoom;
      cam.y = worldFocal.y - (focalScreenPoint.y - viewport.height / 2) / newZoom;
      cam.zoom = newZoom;

      notify();
    },
    [notify],
  );

  const subscribe = useCallback((callback: () => void): (() => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  return { cameraRef, panBy, zoomTo, subscribe };
}
