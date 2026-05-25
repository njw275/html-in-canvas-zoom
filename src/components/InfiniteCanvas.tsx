import { useEffect, useRef, useCallback } from 'react';
import type { Camera } from '../utils/math';
import type { ZoomLevel } from '../levels';
import { splitAtPortal } from '../levels';

interface Props {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
  nestScale: number;
  levels: ZoomLevel[];
}

// Each level's DOM container is this size in world-space
const LEVEL_WIDTH = 900;
const LEVEL_HEIGHT = 200;

export function InfiniteCanvas({ cameraRef, subscribe, nestScale, levels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs to each level's container div and portal span
  const levelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const portalRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Portal offsets: measured center of portal char relative to its container center
  const portalOffsets = useRef<{ x: number; y: number }[]>([]);

  // Measure portal positions after mount
  const measurePortals = useCallback(() => {
    portalOffsets.current = levels.map((_, i) => {
      const container = levelRefs.current[i];
      const portal = portalRefs.current[i];
      if (!container || !portal) return { x: 0, y: 0 };

      const cRect = container.getBoundingClientRect();
      const pRect = portal.getBoundingClientRect();
      return {
        x: (pRect.left + pRect.width / 2) - (cRect.left + cRect.width / 2),
        y: (pRect.top + pRect.height / 2) - (cRect.top + cRect.height / 2),
      };
    });
  }, [levels]);

  // Measure once after first paint
  useEffect(() => {
    // Wait a frame for layout
    const id = requestAnimationFrame(() => {
      measurePortals();
      // Trigger a redraw
      canvasRef.current?.dispatchEvent(new Event('paint'));
    });
    return () => cancelAnimationFrame(id);
  }, [measurePortals]);

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
        drawAll(canvas, ctx, cameraRef.current!, levels, levelRefs.current, portalOffsets.current, nestScale);
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
        const split = splitAtPortal(level);
        return (
          <div
            key={i}
            ref={(el) => { levelRefs.current[i] = el; }}
            style={{
              width: LEVEL_WIDTH,
              height: LEVEL_HEIGHT,
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
              {split ? (
                <>
                  {split.before}
                  <span
                    ref={(el) => { portalRefs.current[i] = el; }}
                    style={{ display: 'inline', color: '#ffffff' }}
                  >
                    {split.portal}
                  </span>
                  {split.after}
                </>
              ) : (
                level.text
              )}
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
  portalOffsets: { x: number; y: number }[],
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

  // ── Camera CTM ────────────────────────────────────────────────
  ctx.save();
  ctx.setTransform(
    cam.zoom * dpr, 0, 0, cam.zoom * dpr,
    (w / 2 - cam.x * cam.zoom) * dpr,
    (h / 2 - cam.y * cam.zoom) * dpr,
  );

  const drawFn = (ctx as any).drawElementImage;
  if (!drawFn) {
    ctx.restore();
    return;
  }

  // Draw each level. Level 0 is at the origin; each subsequent level
  // is translated to the portal of its parent and scaled by nestScale.
  //
  // We accumulate the transform: for level i, the CTM has already been
  // scaled by nestScale^i relative to the camera, so we just need to
  // translate to the parent's portal offset, scale, then draw.

  for (let i = 0; i < levels.length; i++) {
    const el = levelEls[i];
    if (!el) continue;

    // Visibility culling: the effective zoom for this level is cam.zoom * nestScale^(-i)
    // in terms of how big the text appears on screen. If it's way too small or way too big, skip.
    const effectiveScale = cam.zoom * Math.pow(nestScale, i);
    const screenWidth = LEVEL_WIDTH * effectiveScale;

    // Skip if too small to see (< 2px) or too zoomed in (text > 50x viewport)
    if (screenWidth < 2 || screenWidth > w * 50) {
      // Still need to apply the transform for the next level
      if (i < levels.length - 1) {
        const offset = portalOffsets[i] || { x: 0, y: 0 };
        ctx.translate(offset.x, offset.y);
        ctx.scale(nestScale, nestScale);
      }
      continue;
    }

    // Draw this level centered
    ctx.save();
    ctx.translate(-LEVEL_WIDTH / 2, -LEVEL_HEIGHT / 2);
    try {
      const transform = drawFn.call(ctx, el, 0, 0);
      if (transform) el.style.transform = transform.toString();
    } catch { /* first frame before paint */ }
    ctx.restore();

    // Set up transform for the next level: translate to portal, scale down
    if (i < levels.length - 1) {
      const offset = portalOffsets[i] || { x: 0, y: 0 };
      ctx.translate(offset.x, offset.y);
      ctx.scale(nestScale, nestScale);
    }
  }

  ctx.restore();
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
