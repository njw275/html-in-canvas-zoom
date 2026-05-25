import { useEffect, useRef } from 'react';
import type { Camera } from '../utils/math';
import type { ZoomLevel } from '../levels';

interface Props {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
  nestScale: number;
  levels: ZoomLevel[];
}

// Each level's DOM container width in world-space
const LEVEL_WIDTH = 900;
// Per-level height — tighter to the text so vertical centering is accurate
function levelHeight(i: number): number {
  return i === 0 ? 150 : 100;
}

export function InfiniteCanvas({ cameraRef, subscribe, nestScale, levels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs to each level's container div
  const levelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let needsDraw = true;

    const unsub = subscribe(() => { needsDraw = true; });
    const onResize = () => { needsDraw = true; };
    const onPaint = () => { needsDraw = true; };

    window.addEventListener('resize', onResize);
    canvas.addEventListener('paint', onPaint);

    const loop = () => {
      if (needsDraw) {
        drawAll(canvas, ctx, cameraRef.current!, levels, levelRefs.current, nestScale);
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
  }, [cameraRef, subscribe, nestScale, levels]);

  // Determine font size per level — first level is big (h1), rest are slightly smaller
  const fontSize = (i: number) => i === 0 ? 120 : 80;
  const fontWeight = (i: number) => i === 0 ? 800 : 600;

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
      {levels.map((level, i) => {
        const lh = levelHeight(i);
        return (
          <div
            key={i}
            ref={(el) => { levelRefs.current[i] = el; }}
            style={{
              width: LEVEL_WIDTH,
              height: lh,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                margin: 0,
                fontSize: fontSize(i),
                fontWeight: fontWeight(i),
                letterSpacing: '-0.03em',
                color: '#ffffff',
                whiteSpace: 'nowrap',
              }}
            >
              {level.text}
            </span>
          </div>
        );
      })}
    </canvas>
  );
}

// ── Drawing ────────────────────────────────────────────────────────

function drawAll(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  levels: ZoomLevel[],
  levelEls: (HTMLDivElement | null)[],
  nestScale: number,
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

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // ── Dot grid ──────────────────────────────────────────────────
  drawDotGrid(ctx, cam, w, h);

  const drawFn = (ctx as any).drawElementImage;
  if (!drawFn) return;

  // ── Relative zoom-depth rendering ─────────────────────────────
  // Each level is always drawn centered on the camera (wherever you
  // are looking). The zoom *depth* determines which level is visible,
  // not your position. This means zooming into any "o" (or any spot)
  // reveals the next level — it's the magnification that matters.
  //
  // Level i is visible when cam.zoom is around (1/nestScale)^i,
  // i.e. effectiveZoom = cam.zoom * nestScale^i ≈ 1 means that
  // level's text is at "native" size.

  for (let i = 0; i < levels.length; i++) {
    const el = levelEls[i];
    if (!el) continue;

    // How zoomed-in this level's content appears on screen
    const effectiveZoom = cam.zoom * Math.pow(nestScale, i);
    const screenWidth = LEVEL_WIDTH * effectiveZoom;

    // Skip if too small to see (< 2px) or too zoomed in (text > 50x viewport)
    if (screenWidth < 2 || screenWidth > w * 50) continue;

    // Always draw centered on screen (viewport center)
    ctx.setTransform(
      effectiveZoom * dpr, 0, 0, effectiveZoom * dpr,
      (w / 2) * dpr, (h / 2) * dpr,
    );

    // Draw this level centered on its screen position
    ctx.save();
    ctx.translate(-LEVEL_WIDTH / 2, -levelHeight(i) / 2);
    try {
      const transform = drawFn.call(ctx, el, 0, 0);
      if (transform) el.style.transform = transform.toString();
    } catch { /* first frame before paint */ }
    ctx.restore();
  }
}

// ── Dot grid ───────────────────────────────────────────────────────

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
