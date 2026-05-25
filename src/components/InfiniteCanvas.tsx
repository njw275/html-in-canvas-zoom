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

  // Latched world-space anchors for each level.
  // Level 0 is always at origin. Level i>0 latches to the camera
  // position when it first becomes visible, and resets when it
  // goes out of view (so it re-latches next time you zoom in).
  const anchorsRef = useRef<({ x: number; y: number } | null)[]>([]);

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
        drawAll(canvas, ctx, cameraRef.current!, levels, levelRefs.current, nestScale, anchorsRef.current);
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
  anchors: ({ x: number; y: number } | null)[],
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

  // ── Latched anchor rendering ──────────────────────────────────
  // Level 0 is always at world origin. For deeper levels, we latch
  // the anchor to the camera's current position (i.e. where you're
  // looking) the moment that level first becomes visible. This means
  // you can zoom into any spot and the next level appears there —
  // and once placed, it's a real object you can pan around.
  //
  // When you zoom back out and a level leaves the visible range,
  // its anchor resets so it re-latches fresh next time.
  //
  // To handle focal-point zoom drift (cursor off-center shifts the
  // camera in world space, which at deep zoom levels amplifies into
  // huge screen offsets), we re-anchor any level whose center has
  // drifted entirely off-screen.  Since the text is already invisible
  // when this happens, the re-anchor is seamless.

  // Level 0 always anchored at origin
  anchors[0] = { x: 0, y: 0 };

  for (let i = 0; i < levels.length; i++) {
    const el = levelEls[i];
    if (!el) continue;

    // How zoomed-in this level's content appears on screen
    const effectiveZoom = cam.zoom * Math.pow(nestScale, i);
    const screenWidth = LEVEL_WIDTH * effectiveZoom;
    const screenHeight = levelHeight(i) * effectiveZoom;

    // Visibility check
    const visible = screenWidth >= 2 && screenWidth <= w * 50;

    if (!visible) {
      // Reset anchor so it re-latches next time
      anchors[i] = null;
      continue;
    }

    // Keep the level pinned to screen center while it's still too
    // small to read.  Once it crosses the readable threshold
    // (LOCK_WIDTH px on screen) we lock the anchor so the user can
    // pan around it like a real object.  While it's sub-readable,
    // re-anchoring every frame means it always "pops in" centered
    // regardless of focal-point zoom drift.
    const LOCK_WIDTH = 120;               // px — roughly when text becomes legible
    const locked = screenWidth >= LOCK_WIDTH;

    if (anchors[i] == null || !locked) {
      // Pin to camera center (appears at screen center)
      anchors[i] = { x: cam.x, y: cam.y };
    }

    // Screen-space center: project the anchor through the camera
    let sx = (anchors[i]!.x - cam.x) * cam.zoom + w / 2;
    let sy = (anchors[i]!.y - cam.y) * cam.zoom + h / 2;

    // Re-anchor if the locked level has drifted entirely off-screen
    // (happens during deep zooming with the cursor far off-center).
    if (locked) {
      const marginX = w / 2 + screenWidth / 2;
      const marginY = h / 2 + screenHeight / 2;
      if (Math.abs(sx - w / 2) > marginX || Math.abs(sy - h / 2) > marginY) {
        anchors[i] = { x: cam.x, y: cam.y };
        sx = w / 2;
        sy = h / 2;
      }
    }

    // Fresh CTM per level (avoids float32 precision issues)
    ctx.setTransform(
      effectiveZoom * dpr, 0, 0, effectiveZoom * dpr,
      sx * dpr, sy * dpr,
    );

    // Draw centered
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
