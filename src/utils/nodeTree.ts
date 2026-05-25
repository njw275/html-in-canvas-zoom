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
// Children start appearing when the parent node's apparent width on
// screen reaches REVEAL_START_PX, and are fully visible at REVEAL_END_PX.
const REVEAL_START_PX = 600;   // node apparent width to begin child reveal
const REVEAL_END_PX = 1200;    // node apparent width for full child reveal

/**
 * Calculate the reveal progress for a node's children based on how
 * large the node itself appears on screen.
 *
 * Root node (level 0) always reveals its children — they're the
 * initial mind map layout. For deeper nodes, children fade in as
 * the node grows to fill the viewport.
 */
export function getRevealProgress(node: MindMapNode, camera: Camera): number {
  // Root always shows its children
  if (node.level === 0) return 1;

  // How big this node appears on screen
  const apparentWidth = node.width * camera.zoom;
  return clamp(
    (apparentWidth - REVEAL_START_PX) / (REVEAL_END_PX - REVEAL_START_PX),
    0,
    1,
  );
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
