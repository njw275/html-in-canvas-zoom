import { memo } from 'react';
import type { Camera } from '../utils/math';
import type { MindMapNode, LODTier } from '../types';
import { getLOD } from '../hooks/useLOD';

interface MindMapNodeProps {
  node: MindMapNode;
  camera: Camera;
}

export const MindMapNodeView = memo(function MindMapNodeView({ node, camera }: MindMapNodeProps) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const lod: LODTier = getLOD(node, camera, vw, vh);

  if (lod === 'hidden') return null;

  // Dot: tiny colored indicator
  if (lod === 'dot') {
    return (
      <div
        style={{
          position: 'absolute',
          left: node.x + node.width / 2 - 6,
          top: node.y + node.height / 2 - 6,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: node.accentColor,
          opacity: 0.6,
        }}
      />
    );
  }

  // Card: title only
  if (lod === 'card') {
    return (
      <div
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: node.width,
          padding: '16px 20px',
          background: 'rgba(16, 16, 24, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid rgba(255, 255, 255, 0.08)`,
          borderRadius: 12,
          boxShadow: `0 0 20px ${node.accentColor}15`,
          contain: 'layout style paint',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: node.accentColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {node.title}
        </h2>
      </div>
    );
  }

  // Full or zoomed-past: complete content
  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        background: 'rgba(16, 16, 24, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: `0 0 30px ${node.accentColor}20, inset 0 0 0 1px rgba(255,255,255,0.03)`,
        overflow: 'hidden',
        contain: 'layout style paint',
      }}
    >
      <h2
        style={{
          margin: '0 0 12px 0',
          fontSize: 22,
          fontWeight: 700,
          color: node.accentColor,
          letterSpacing: '-0.02em',
        }}
      >
        {node.title}
      </h2>
      <div
        className="node-content"
        dangerouslySetInnerHTML={{ __html: node.content }}
      />
    </div>
  );
});
