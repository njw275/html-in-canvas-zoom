import { useEffect, useRef, useCallback } from 'react';
import type { Camera } from '../utils/math';

interface CanvasLayerProps {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
}

/**
 * Background canvas layer: renders a fractal dot grid that scales
 * smoothly with zoom. Dots appear and disappear as you zoom in/out,
 * giving the feeling of infinite space.
 */
export function CanvasLayer({ cameraRef, subscribe }: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dirtyRef = useRef(true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
    if (!canvas || !cam) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Resize canvas if needed
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    // ── Fractal dot grid ──────────────────────────────────────────
    // Find a grid spacing where dots are 20-80px apart on screen
    const BASE_SPACING = 50;
    const idealScreenSpacing = 50;

    // Calculate grid level: we want spacing * zoom ≈ idealScreenSpacing
    // So spacing = idealScreenSpacing / zoom
    // We snap to powers of a nice base (5) to get a "fractal" feel
    const rawSpacing = idealScreenSpacing / cam.zoom;
    const logBase = Math.log10(rawSpacing / BASE_SPACING);
    const level = Math.floor(logBase);
    const spacing = BASE_SPACING * Math.pow(10, level);
    const screenSpacing = spacing * cam.zoom;

    // Fade: dots at current level are full opacity when screenSpacing is
    // in the sweet spot, fade out when too large (subdivision appearing)
    const t = (screenSpacing - 20) / (80 - 20); // 0..1 within range
    const alpha = 0.12 * Math.min(1, Math.max(0.3, 1 - Math.abs(t - 0.5)));

    // Also draw a finer sublevel for smooth transitions
    const subSpacing = spacing / 10;
    const subScreenSpacing = subSpacing * cam.zoom;
    const subAlpha = subScreenSpacing > 10 ? 0.05 * Math.min(1, (subScreenSpacing - 10) / 30) : 0;

    // Calculate visible world bounds
    const worldLeft = cam.x - w / (2 * cam.zoom);
    const worldTop = cam.y - h / (2 * cam.zoom);
    const worldRight = cam.x + w / (2 * cam.zoom);
    const worldBottom = cam.y + h / (2 * cam.zoom);

    // Draw dots for each grid level
    const drawDots = (sp: number, a: number) => {
      if (a < 0.01 || sp * cam.zoom < 5) return;

      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;

      const startX = Math.floor(worldLeft / sp) * sp;
      const startY = Math.floor(worldTop / sp) * sp;

      // Limit iterations to prevent performance issues
      const maxDots = 10000;
      let count = 0;

      for (let wx = startX; wx <= worldRight && count < maxDots; wx += sp) {
        for (let wy = startY; wy <= worldBottom && count < maxDots; wy += sp) {
          // World to screen
          const sx = (wx - cam.x) * cam.zoom + w / 2;
          const sy = (wy - cam.y) * cam.zoom + h / 2;

          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
          count++;
        }
      }
    };

    drawDots(spacing, alpha);
    if (subAlpha > 0.01) {
      drawDots(subSpacing, subAlpha);
    }
  }, [cameraRef]);

  // Animation loop — only redraws when dirty
  useEffect(() => {
    const loop = () => {
      if (dirtyRef.current) {
        draw();
        dirtyRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // Subscribe to camera changes
    const unsub = subscribe(() => {
      dirtyRef.current = true;
    });

    // Also handle resize
    const onResize = () => { dirtyRef.current = true; };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      unsub();
      window.removeEventListener('resize', onResize);
    };
  }, [draw, subscribe]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
