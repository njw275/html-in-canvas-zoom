export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Convert screen coordinates to world coordinates. Camera x,y is the world-space center of the viewport. */
export function screenToWorld(screenPoint: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (screenPoint.x - viewport.width / 2) / camera.zoom + camera.x,
    y: (screenPoint.y - viewport.height / 2) / camera.zoom + camera.y,
  };
}

/** Convert world coordinates to screen coordinates. Inverse of screenToWorld. */
export function worldToScreen(worldPoint: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (worldPoint.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (worldPoint.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation from a to b by factor t. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
