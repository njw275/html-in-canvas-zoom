import { useEffect, useRef, useState } from 'react';
import type { Camera } from '../utils/math';
import type { MindMapNode } from '../types';
import { getLOD } from '../hooks/useLOD';

interface InfiniteCanvasProps {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
  rootNode: MindMapNode;
}

/**
 * Single <canvas layoutsubtree> element that:
 * 1. Renders HTML nodes as direct children of the canvas
 * 2. Draws them into the canvas via ctx.drawElementImage()
 * 3. Uses canvas CTM for zoom/pan — browser re-rasterizes at full fidelity
 * 4. Also draws the dot grid, connections, etc.
 *
 * This uses the WICG html-in-canvas proposal:
 * https://github.com/WICG/html-in-canvas/blob/main/README.md
 */
export function InfiniteCanvas({ cameraRef, subscribe, rootNode }: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, forceRender] = useState(0);
  const needsDrawRef = useRef(true);

  // Collect all nodes to render
  const allNodes: MindMapNode[] = [rootNode, ...rootNode.children];

  // Register a node ref
  const setNodeRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      nodeRefsMap.current.set(id, el);
    } else {
      nodeRefsMap.current.delete(id);
    }
  };

  // Main draw + paint loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let needsDraw = true;

    const unsub = subscribe(() => {
      needsDraw = true;
    });

    const onResize = () => {
      needsDraw = true;
      forceRender((n) => n + 1);
    };
    window.addEventListener('resize', onResize);

    // Handle the paint event — this is the html-in-canvas API
    const onPaint = () => {
      draw(canvas, ctx, cameraRef.current!, nodeRefsMap.current, allNodes);
    };
    canvas.addEventListener('paint', onPaint);

    const loop = () => {
      if (needsDraw) {
        draw(canvas, ctx, cameraRef.current!, nodeRefsMap.current, allNodes);
        needsDraw = false;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      unsub();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('paint', onPaint);
    };
  }, [cameraRef, subscribe, allNodes]);

  const cam = cameraRef.current!;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  return (
    <canvas
      ref={canvasRef}
      // @ts-expect-error — layoutsubtree is the html-in-canvas opt-in attribute
      layoutsubtree=""
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {/* HTML nodes are direct children of the canvas */}
      {allNodes.map((node) => {
        const lod = getLOD(node, cam, vw, vh);
        if (lod === 'hidden') return null;

        return (
          <div
            key={node.id}
            ref={setNodeRef(node.id)}
            data-node-id={node.id}
            data-lod={lod}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: node.width,
              height: lod === 'dot' ? 12 : lod === 'card' ? 'auto' : node.height,
              // Not visible by default — drawn via drawElementImage
            }}
          >
            {lod === 'dot' ? (
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: node.accentColor,
                  opacity: 0.6,
                }}
              />
            ) : lod === 'card' ? (
              <div
                style={{
                  padding: '16px 20px',
                  background: 'rgba(16, 16, 24, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  boxShadow: `0 0 20px ${node.accentColor}15`,
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
            ) : (
              <div
                style={{
                  width: node.width,
                  height: node.height,
                  background: 'rgba(16, 16, 24, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '24px 28px',
                  boxShadow: `0 0 30px ${node.accentColor}20, inset 0 0 0 1px rgba(255,255,255,0.03)`,
                  overflow: 'hidden',
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
            )}
          </div>
        );
      })}
    </canvas>
  );
}

/**
 * Main draw function — draws grid + HTML elements into the canvas
 */
function draw(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  nodeRefs: Map<string, HTMLDivElement>,
  allNodes: MindMapNode[],
) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Resize canvas buffer
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }

  // Reset and clear
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // ── Draw dot grid ────────────────────────────────────────────
  drawDotGrid(ctx, cam, w, h);

  // ── Draw HTML elements via drawElementImage ───────────────────
  // Set up camera transform on the canvas CTM
  ctx.save();
  ctx.setTransform(
    cam.zoom * dpr,    // scaleX
    0,                 // skewY
    0,                 // skewX
    cam.zoom * dpr,    // scaleY
    (w / 2 - cam.x * cam.zoom) * dpr,  // translateX
    (h / 2 - cam.y * cam.zoom) * dpr,  // translateY
  );

  // Draw each node element at its world position
  for (const node of allNodes) {
    const el = nodeRefs.get(node.id);
    if (!el) continue;

    try {
      // drawElementImage draws the element using the current CTM
      // We translate to the node's world position, then draw
      ctx.save();
      ctx.translate(node.x, node.y);

      // The API: ctx.drawElementImage(element, dx, dy)
      // It draws the element's rendered content at (dx, dy) in current coords
      const drawFn = (ctx as any).drawElementImage;
      if (drawFn) {
        const transform = drawFn.call(ctx, el, 0, 0);
        // Apply the returned CSS transform to sync hit testing
        if (transform) {
          el.style.transform = transform.toString();
        }
      }

      ctx.restore();
    } catch (e) {
      // drawElementImage may throw if snapshot not yet recorded
      // (e.g., first frame before paint event)
    }
  }

  ctx.restore();
}

/**
 * Draw the fractal dot grid
 */
function drawDotGrid(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number) {
  const BASE = 50;

  const raw = BASE / cam.zoom;
  const logLevel = Math.log10(raw / BASE);
  const level = Math.floor(logLevel);
  const spacing = BASE * Math.pow(10, level);
  const screenSpacing = spacing * cam.zoom;

  const worldLeft = cam.x - w / (2 * cam.zoom);
  const worldTop = cam.y - h / (2 * cam.zoom);
  const worldRight = cam.x + w / (2 * cam.zoom);
  const worldBottom = cam.y + h / (2 * cam.zoom);

  const drawDots = (sp: number, screenSp: number) => {
    if (screenSp < 8) return;

    const alpha = screenSp < 20
      ? 0.6 * ((screenSp - 8) / 12)
      : screenSp < 100
        ? 0.6
        : 0.6 * Math.max(0, 1 - (screenSp - 100) / 200);

    if (alpha < 0.005) return;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

    const startX = Math.floor(worldLeft / sp) * sp;
    const startY = Math.floor(worldTop / sp) * sp;

    let count = 0;
    const MAX = 15000;

    for (let wx = startX; wx <= worldRight && count < MAX; wx += sp) {
      for (let wy = startY; wy <= worldBottom && count < MAX; wy += sp) {
        const sx = (wx - cam.x) * cam.zoom + w / 2;
        const sy = (wy - cam.y) * cam.zoom + h / 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
        count++;
      }
    }
  };

  drawDots(spacing, screenSpacing);

  const fineSpacing = spacing / 5;
  const fineScreenSpacing = fineSpacing * cam.zoom;
  if (fineScreenSpacing > 12) {
    drawDots(fineSpacing, fineScreenSpacing);
  }
}
