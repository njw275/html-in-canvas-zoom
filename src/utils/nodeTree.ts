import type { Camera } from './math';
import type { MindMapNode } from '../types';
import { clamp } from './math';

/**
 * A flattened node with its absolute world position computed
 * by walking the parent chain.
 */
export interface FlatNode {
  node: MindMapNode;
  /** Absolute world-space X (accumulated from parent positions) */
  worldX: number;
  /** Absolute world-space Y */
  worldY: number;
  /** The parent FlatNode, or null for root */
  parent: FlatNode | null;
  /** How revealed this node's children are (0 = hidden, 1 = fully visible) */
  childRevealProgress: number;
}

// ── Reveal thresholds ──────────────────────────────────────────────
// When the portal character reaches REVEAL_START px on screen, children
// begin fading in. At REVEAL_END they're fully opaque.
const REVEAL_START = 150;  // px — portal char apparent size to begin reveal
const REVEAL_END = 400;    // px — portal char apparent size for full reveal

// Approximate width of a single character in the title at font-size 22px
const CHAR_WIDTH_APPROX = 14; // px in world space (before zoom)

/**
 * Calculate the reveal progress for a node's children based on how
 * large the portal character appears on screen.
 *
 * The portal char's world-space width is ~CHAR_WIDTH_APPROX px.
 * Its screen-space width is that × camera.zoom.
 * We map that into [0, 1] over the [REVEAL_START, REVEAL_END] range.
 */
export function getRevealProgress(node: MindMapNode, camera: Camera): number {
  // How big the portal char appears on screen
  const portalScreenWidth = CHAR_WIDTH_APPROX * camera.zoom;
  return clamp((portalScreenWidth - REVEAL_START) / (REVEAL_END - REVEAL_START), 0, 1);
}

/**
 * Flatten the node tree into a list with absolute world positions.
 * Children only appear if their parent's reveal progress > 0.
 *
 * Children are positioned relative to their parent — their (x, y) in the
 * data is an offset from the parent's world position.
 */
export function flattenTree(
  root: MindMapNode,
  camera: Camera,
): FlatNode[] {
  const result: FlatNode[] = [];

  function walk(node: MindMapNode, parentWorldX: number, parentWorldY: number, parent: FlatNode | null) {
    const worldX = parentWorldX + node.x;
    const worldY = parentWorldY + node.y;

    const revealProgress = getRevealProgress(node, camera);

    const flat: FlatNode = {
      node,
      worldX,
      worldY,
      parent,
      childRevealProgress: revealProgress,
    };
    result.push(flat);

    // Only descend if children would be at least slightly visible
    if (revealProgress > 0 && node.children.length > 0) {
      for (const child of node.children) {
        walk(child, worldX, worldY, flat);
      }
    }
  }

  walk(root, 0, 0, null);
  return result;
}

/**
 * Get the reveal opacity for a child node, based on its parent's
 * reveal progress. Root node is always fully opaque.
 */
export function getChildOpacity(flatNode: FlatNode): number {
  if (!flatNode.parent) return 1; // root is always visible
  return flatNode.parent.childRevealProgress;
}

/**
 * Get the portal character opacity — inverse of the reveal progress.
 * As children become visible, the portal char fades out.
 */
export function getPortalCharOpacity(flatNode: FlatNode): number {
  return 1 - flatNode.childRevealProgress * 0.7; // don't fully disappear, min 0.3
}
