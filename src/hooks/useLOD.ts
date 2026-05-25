import type { Camera } from '../utils/math';
import type { MindMapNode, LODTier } from '../types';

/**
 * Calculate the Level of Detail tier for a node given the current camera.
 * Determines how much content to render based on the node's apparent
 * screen size and whether it's visible in the viewport.
 *
 * worldX/worldY are the node's absolute world position (pre-computed
 * by flattenTree for nested nodes).
 */
export function getLOD(
  node: MindMapNode,
  worldX: number,
  worldY: number,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): LODTier {
  // Apparent width of the node on screen (in pixels)
  const apparentWidth = node.width * camera.zoom;

  // Check if node is roughly in viewport
  const screenCenterX = (worldX - camera.x) * camera.zoom + viewportWidth / 2;
  const screenCenterY = (worldY - camera.y) * camera.zoom + viewportHeight / 2;
  const halfW = (node.width * camera.zoom) / 2;
  const halfH = (node.height * camera.zoom) / 2;

  const margin = 200; // px buffer
  if (
    screenCenterX + halfW < -margin ||
    screenCenterX - halfW > viewportWidth + margin ||
    screenCenterY + halfH < -margin ||
    screenCenterY - halfH > viewportHeight + margin
  ) {
    return 'hidden';
  }

  if (apparentWidth < 30) return 'hidden';
  if (apparentWidth < 80) return 'dot';
  if (apparentWidth < 250) return 'card';
  if (apparentWidth < 2000) return 'full';
  return 'zoomed-past';
}
