import { useEffect, useRef, useState, useMemo } from 'react';
import type { Camera } from '../utils/math';
import type { MindMapNode } from '../types';
import { getLOD } from '../hooks/useLOD';
import { flattenTree, getChildOpacity, getPortalCharOpacity } from '../utils/nodeTree';
import type { FlatNode } from '../utils/nodeTree';

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
 * 4. Draws the dot grid + bezier connection curves
 * 5. Manages the portal reveal system for continuous zoom
 */
export function InfiniteCanvas({ cameraRef, subscribe, rootNode }: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [renderTick, setRenderTick] = useState(0);
  const dashOffsetRef = useRef(0);

  // Force re-render periodically to update LOD/reveal (camera changes are ref-based)
  useEffect(() => {
    const unsub = subscribe(() => {
      setRenderTick((n) => n + 1);
    });
    return unsub;
  }, [subscribe]);

  // Flatten the tree based on current camera state
  const cam = cameraRef.current!;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const flatNodes = useMemo(
    () => flattenTree(rootNode, cam),
    // renderTick dependency forces recalc on camera changes
    [rootNode, renderTick],
  );

  // Register a node ref
  const setNodeRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      nodeRefsMap.current.set(id, el);
    } else {
      nodeRefsMap.current.delete(id);
    }
  };

  // Wrap portal char in the title with a span
  const renderTitle = (flatNode: FlatNode) => {
    const { node } = flatNode;
    const portalOpacity = getPortalCharOpacity(flatNode);
    const idx = node.title.indexOf(node.portalChar);

    if (idx === -1) {
      return <>{node.title}</>;
    }

    return (
      <>
        {node.title.slice(0, idx)}
        <span
          className="portal-char"
          style={{
            opacity: portalOpacity,
            color: node.accentColor,
            textShadow: flatNode.childRevealProgress > 0
              ? `0 0 ${8 + flatNode.childRevealProgress * 20}px ${node.accentColor}`
              : 'none',
          }}
          data-portal={node.portalChar}
        >
          {node.portalChar}
        </span>
        {node.title.slice(idx + node.portalChar.length)}
      </>
    );
  };

  // Main draw + paint loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let needsDraw = true;
    let lastTime = 0;

    const unsubCamera = subscribe(() => {
      needsDraw = true;
    });

    const onResize = () => {
      needsDraw = true;
    };
    window.addEventListener('resize', onResize);

    // Handle the paint event — this is the html-in-canvas API
    const onPaint = () => {
      needsDraw = true;
    };
    canvas.addEventListener('paint', onPaint);

    const loop = (time: number) => {
      const dt = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;

      // Animate dash offset for connection lines
      dashOffsetRef.current -= dt * 30;

      if (needsDraw) {
        draw(canvas, ctx, cameraRef.current!, nodeRefsMap.current, flatNodes, dashOffsetRef.current);
        needsDraw = false;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      unsubCamera();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('paint', onPaint);
    };
  }, [cameraRef, subscribe, flatNodes]);

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
      {flatNodes.map((flatNode) => {
        const { node } = flatNode;
        const lod = getLOD(node, flatNode.worldX, flatNode.worldY, cam, vw, vh);
        if (lod === 'hidden') return null;

        const childOpacity = getChildOpacity(flatNode);

        // Skip rendering children that are barely visible
        if (childOpacity < 0.01 && flatNode.parent !== null) return null;

        return (
          <div
            key={node.id}
            ref={setNodeRef(node.id)}
            data-node-id={node.id}
            data-lod={lod}
            data-world-x={flatNode.worldX}
            data-world-y={flatNode.worldY}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: node.width,
              height: lod === 'dot' ? 12 : lod === 'card' ? 'auto' : node.height,
              opacity: flatNode.parent ? childOpacity : 1,
              transition: 'opacity 0.15s ease-out',
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
                  {renderTitle(flatNode)}
                </h2>
              </div>
            ) : (
              <div
                className={`node-card ${flatNode.childRevealProgress > 0 ? 'revealing' : ''}`}
                style={{
                  width: node.width,
                  height: node.height,
                  background: 'rgba(16, 16, 24, 0.9)',
                  border: `1px solid rgba(255, 255, 255, ${0.1 + flatNode.childRevealProgress * 0.1})`,
                  borderRadius: 12,
                  padding: '24px 28px',
                  boxShadow: flatNode.childRevealProgress > 0
                    ? `0 0 ${30 + flatNode.childRevealProgress * 40}px ${node.accentColor}${Math.round(32 + flatNode.childRevealProgress * 30).toString(16)}`
                    : `0 0 30px ${node.accentColor}20, inset 0 0 0 1px rgba(255,255,255,0.03)`,
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
                  {renderTitle(flatNode)}
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
 * Main draw function — draws grid + connection curves + HTML elements into the canvas
 */
function draw(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  nodeRefs: Map<string, HTMLDivElement>,
  flatNodes: FlatNode[],
  dashOffset: number,
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

  // ── Draw connection curves between parents and children ──────
  drawConnections(ctx, cam, w, h, flatNodes, dashOffset);

  // ── Draw HTML elements via drawElementImage ───────────────────
  ctx.save();
  ctx.setTransform(
    cam.zoom * dpr,
    0,
    0,
    cam.zoom * dpr,
    (w / 2 - cam.x * cam.zoom) * dpr,
    (h / 2 - cam.y * cam.zoom) * dpr,
  );

  // Draw each node element at its world position
  for (const flatNode of flatNodes) {
    const el = nodeRefs.get(flatNode.node.id);
    if (!el) continue;

    try {
      ctx.save();
      ctx.translate(flatNode.worldX, flatNode.worldY);

      const drawFn = (ctx as any).drawElementImage;
      if (drawFn) {
        const transform = drawFn.call(ctx, el, 0, 0);
        if (transform) {
          el.style.transform = transform.toString();
        }
      }

      ctx.restore();
    } catch {
      // drawElementImage may throw if snapshot not yet recorded
    }
  }

  ctx.restore();
}

/**
 * Draw bezier connection curves between parent and child nodes
 */
function drawConnections(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  flatNodes: FlatNode[],
  dashOffset: number,
) {
  for (const flatNode of flatNodes) {
    if (!flatNode.parent) continue;

    const parentOpacity = flatNode.parent.childRevealProgress;
    if (parentOpacity < 0.01) continue;

    const parent = flatNode.parent;

    // Parent center in screen space
    const parentScreenX = (parent.worldX + parent.node.width / 2 - cam.x) * cam.zoom + w / 2;
    const parentScreenY = (parent.worldY + parent.node.height / 2 - cam.y) * cam.zoom + h / 2;

    // Child center in screen space
    const childScreenX = (flatNode.worldX + flatNode.node.width / 2 - cam.x) * cam.zoom + w / 2;
    const childScreenY = (flatNode.worldY + flatNode.node.height / 2 - cam.y) * cam.zoom + h / 2;

    // Skip if both endpoints are way off screen
    if (
      (parentScreenX < -200 && childScreenX < -200) ||
      (parentScreenX > w + 200 && childScreenX > w + 200) ||
      (parentScreenY < -200 && childScreenY < -200) ||
      (parentScreenY > h + 200 && childScreenY > h + 200)
    ) {
      continue;
    }

    // Draw bezier curve
    const cpOffset = Math.abs(childScreenY - parentScreenY) * 0.4;

    ctx.save();
    ctx.globalAlpha = parentOpacity * 0.5;
    ctx.strokeStyle = flatNode.node.accentColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = dashOffset;

    ctx.beginPath();
    ctx.moveTo(parentScreenX, parentScreenY);
    ctx.bezierCurveTo(
      parentScreenX,
      parentScreenY + cpOffset,
      childScreenX,
      childScreenY - cpOffset,
      childScreenX,
      childScreenY,
    );
    ctx.stroke();

    ctx.restore();
  }
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
