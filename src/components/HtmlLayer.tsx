import { useEffect, useState, useRef } from 'react';
import type { Camera } from '../utils/math';
import type { MindMapNode } from '../types';
import { MindMapNodeView } from './MindMapNodeView';

interface HtmlLayerProps {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
  rootNode: MindMapNode;
}

/**
 * HTML content layer: a div with CSS transform synced to the camera.
 * Renders all mind map nodes as real DOM elements.
 */
export function HtmlLayer({ cameraRef, subscribe, rootNode }: HtmlLayerProps) {
  // Force re-render when camera changes so nodes get new LOD
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const rafRef = useRef<number>(0);
  const needsUpdateRef = useRef(true);

  useEffect(() => {
    const unsub = subscribe(() => {
      needsUpdateRef.current = true;
    });

    const loop = () => {
      if (needsUpdateRef.current) {
        setCamera({ ...cameraRef.current! });
        needsUpdateRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    needsUpdateRef.current = true;
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      unsub();
    };
  }, [cameraRef, subscribe]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Collect all nodes to render (root + children for now)
  const allNodes: MindMapNode[] = [rootNode, ...rootNode.children];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: vw / 2 - camera.x * camera.zoom,
          top: vh / 2 - camera.y * camera.zoom,
          zoom: camera.zoom,
          willChange: 'zoom, left, top',
          pointerEvents: 'auto',
        }}
      >
        {allNodes.map((node) => (
          <MindMapNodeView key={node.id} node={node} camera={camera} />
        ))}
      </div>
    </div>
  );
}
