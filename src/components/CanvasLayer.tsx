import { useEffect, useRef } from 'react';
import type { Camera } from '../utils/math';

interface CanvasLayerProps {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
}

export function CanvasLayer({ cameraRef, subscribe }: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let needsDraw = true;

    const unsub = subscribe(() => {
      needsDraw = true;
    });

    const onResize = () => {
      needsDraw = true;
    };
    window.addEventListener('resize', onResize);

    const loop = () => {
      if (needsDraw) {
        drawGrid(canvas, ctx, cameraRef.current!);
        needsDraw = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    // Always draw at least once
    needsDraw = true;
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      unsub();
      window.removeEventListener('resize', onResize);
    };
  }, [cameraRef, subscribe]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

function drawGrid(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, cam: Camera) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Resize canvas buffer to match screen
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }

  // Reset transform and clear
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // ── Fractal dot grid ──────────────────────────────────────────
  // Find grid spacing where dots are ~30-80px apart on screen
  const BASE = 50;

  // What world-space spacing gives us ~50px screen spacing?
  // screenSpacing = worldSpacing * zoom → worldSpacing = 50 / zoom
  // Snap to powers of 10 relative to BASE
  const raw = BASE / cam.zoom; // if zoom < 1, raw > BASE
  const logLevel = Math.log10(raw / BASE); // 0 when raw == BASE
  const level = Math.floor(logLevel);
  const spacing = BASE * Math.pow(10, level);
  const screenSpacing = spacing * cam.zoom;

  // Visible world bounds
  const worldLeft = cam.x - w / (2 * cam.zoom);
  const worldTop = cam.y - h / (2 * cam.zoom);
  const worldRight = cam.x + w / (2 * cam.zoom);
  const worldBottom = cam.y + h / (2 * cam.zoom);

  // Draw two grid levels for smooth transitions
  drawDots(ctx, cam, spacing, screenSpacing, worldLeft, worldTop, worldRight, worldBottom, w, h);

  const fineSpacing = spacing / 5;
  const fineScreenSpacing = fineSpacing * cam.zoom;
  if (fineScreenSpacing > 12) {
    drawDots(ctx, cam, fineSpacing, fineScreenSpacing, worldLeft, worldTop, worldRight, worldBottom, w, h);
  }
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  spacing: number,
  screenSpacing: number,
  worldLeft: number,
  worldTop: number,
  worldRight: number,
  worldBottom: number,
  w: number,
  h: number,
) {
  if (screenSpacing < 8) return;

  // Opacity ramps up as dots get more spaced out, fades when very spread
  const alpha = screenSpacing < 20
    ? 0.6 * ((screenSpacing - 8) / 12)
    : screenSpacing < 100
      ? 0.6
      : 0.6 * Math.max(0, 1 - (screenSpacing - 100) / 200);

  if (alpha < 0.005) return;

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

  const startX = Math.floor(worldLeft / spacing) * spacing;
  const startY = Math.floor(worldTop / spacing) * spacing;
  const endX = worldRight;
  const endY = worldBottom;

  let count = 0;
  const MAX = 15000;

  for (let wx = startX; wx <= endX && count < MAX; wx += spacing) {
    for (let wy = startY; wy <= endY && count < MAX; wy += spacing) {
      const sx = (wx - cam.x) * cam.zoom + w / 2;
      const sy = (wy - cam.y) * cam.zoom + h / 2;

      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
      count++;
    }
  }
}
