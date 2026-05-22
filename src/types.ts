export interface MindMapNode {
  id: string;
  x: number;           // world-space position in parent's coordinate system
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;     // HTML string
  portalChar: string;  // character in title that acts as the zoom portal
  children: MindMapNode[];
  level: number;       // 0-4
  accentColor: string; // per-level accent
}

export type LODTier = 'hidden' | 'dot' | 'card' | 'full' | 'zoomed-past';
