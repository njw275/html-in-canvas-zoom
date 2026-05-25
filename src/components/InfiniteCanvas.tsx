import { useEffect, useRef, useState } from 'react';
import type { Camera } from '../utils/math';

interface Props {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
}

// ── World-space layout constants ───────────────────────────────────
// h1 container: sized to hold "Welcome" at 120px comfortably
const H1_WIDTH = 900;
const H1_HEIGHT = 200;

// h2 container: normal readable size (gets scaled down by NEST_SCALE)
const H2_WIDTH = 700;
const H2_HEIGHT = 120;

// How much smaller the h2 is in world space.
// At zoom 1x:  h2 is ~23px wide — invisible speck inside the O
// At zoom 10x: h2 is 233px wide — starting to read
// At zoom 30x: h2 is 700px wide — fully readable, O is off-screen
const NEST_SCALE = 1 / 30;

export function InfiniteCanvas({ cameraRef, subscribe }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const h1Ref = useRef<HTMLDivElement>(null);
  const h2Ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLSpanElement>(null);

  // O center offset from h1 container center (measured at runtime)
  const [oOffset, setOOffset] = useState({ x: 40, y: 0 });

  // Measure the portal "O" position after first render
  useEffect(() => {
    const span = portalRef.current;
    const container = h1Ref.current;
    if (!span || !container) return;

    const cRect = container.getBoundingClientRect();
    const sRect = span.getBoundingClientRect();

    setOOffset({
      x: (sRect.left + sRect.width / 2) - (cRect.left + cRect.width / 2),
      y: (sRect.top + sRect.height / 2) - (cRect.top + cRect.height / 2),
    });
  }, []);

  // Main draw loop
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
    };
    window.addEventListener('resize', onResize);

    const onPaint = () => {
      needsDraw = true;
    };
    canvas.addEventListener('paint', onPaint);

    const loop = () => {
      if (needsDraw) {
        draw(canvas, ctx, cameraRef.current!, h1Ref.current, h2Ref.current, oOffset);
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
  }, [cameraRef, subscribe, oOffset]);

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
      {/* Layer 0: the h1 "Welcome" */}
      <div
        ref={h1Ref}
        style={{
          width: H1_WIDTH,
          height: H1_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h1 className="welcome-text">
          Welc<span ref={portalRef} className="portal-o">o</span>me
        </h1>
      </div>

      {/* Layer 1: the h2 "to the zoom grid" — drawn tiny at the O's center */}
      <div
        ref={h2Ref}
        style={{
          width: H2_WIDTH,
          height: H2_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2 className="inner-text">to the zoom grid</h2>
      </div>
    </canvas>
  );
}

// ── Drawing ────────────────────────────────────────────────────────

function draw(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  h1El: HTMLDivElement | null,
  h2El: HTMLDivElement | null,
  oOffset: { x: number; y: number },
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

  // ── Draw h1 "Welcome" centered at world origin ────────────────
  if (h1El) {
    ctx.save();
    ctx.translate(-H1_WIDTH / 2, -H1_HEIGHT / 2);
    try {
      const transform = drawFn.call(ctx, h1El, 0, 0);
      if (transform) h1El.style.transform = transform.toString();
    } catch { /* first frame before paint */ }
    ctx.restore();
  }

  // ── Draw h2 "to the zoom grid" inside the O ──────────────────
  // Positioned at O's center, scaled down by NEST_SCALE so it's
  // a tiny speck at zoom 1x but readable when you zoom to ~30x
  if (h2El) {
    ctx.save();
    ctx.translate(oOffset.x, oOffset.y);
    ctx.scale(NEST_SCALE, NEST_SCALE);
    ctx.translate(-H2_WIDTH / 2, -H2_HEIGHT / 2);
    try {
      const transform = drawFn.call(ctx, h2El, 0, 0);
      if (transform) h2El.style.transform = transform.toString();
    } catch { /* first frame before paint */ }
    ctx.restore();
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
