import type { MindMapNode } from '../types';

// Accent colors per level
const LEVEL_COLORS = [
  '#6888f0', // L0 — soft blue
  '#a078e0', // L1 — purple
  '#50b8b0', // L2 — teal
  '#e0a848', // L3 — amber
  '#e06878', // L4 — rose
];

export const mindMapData: MindMapNode = {
  id: 'root',
  x: 0,
  y: 0,
  width: 700,
  height: 420,
  title: 'The Infinite Mind Map',
  portalChar: 'I',
  level: 0,
  accentColor: LEVEL_COLORS[0],
  content: `
    <p>Welcome to the infinite zooming mind map — a demo of <strong>HTML rendered inside a Canvas-driven camera system</strong>.</p>
    <p>Every node you see is real HTML — crisp text, rich content, interactive elements. The canvas handles the infinite 2D universe: pan, zoom, connections.</p>
    <ul>
      <li>Scroll to zoom in — the deeper you go, the more you discover</li>
      <li>Drag to pan around the universe</li>
      <li>Each level reveals a new world of content</li>
    </ul>
    <p>Zoom into any title to find what's hidden inside...</p>
  `,
  children: [
    {
      id: 'html',
      x: -800,
      y: -500,
      width: 600,
      height: 380,
      title: 'HTML',
      portalChar: 'H',
      level: 1,
      accentColor: LEVEL_COLORS[1],
      content: `
        <p>HTML is the backbone of this demo. Every mind map node is a <strong>real DOM element</strong>, not pixels painted on a canvas.</p>
        <p>This means text is always crisp, selectable, and accessible — no matter how far you zoom in.</p>
        <ul>
          <li>Native text rendering at every scale</li>
          <li>CSS handles layout, typography, and styling</li>
          <li>The browser's text engine does the hard work</li>
        </ul>
        <pre><code>&lt;div class="node"&gt;
  &lt;h2&gt;Real HTML&lt;/h2&gt;
  &lt;p&gt;Not canvas pixels&lt;/p&gt;
&lt;/div&gt;</code></pre>
      `,
      children: [
        {
          id: 'html-dom',
          x: -450,
          y: -350,
          width: 500,
          height: 340,
          title: 'The DOM',
          portalChar: 'D',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>The <strong>Document Object Model</strong> is the browser's living representation of your HTML.</p>
            <p>Every element is a node in a tree. Changes to the tree trigger layout, paint, and composite — the browser's rendering pipeline.</p>
            <ul>
              <li>Tree structure: parents, children, siblings</li>
              <li>Mutation triggers reflow — expensive but powerful</li>
              <li>querySelectorAll, getElementById — your API into the tree</li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'html-css',
          x: 100,
          y: -350,
          width: 500,
          height: 340,
          title: 'CSS Transforms',
          portalChar: 'T',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>CSS transforms move elements without triggering layout — they operate at the <strong>composite</strong> layer.</p>
            <p><code>transform: scale()</code> rasterizes once and stretches (blurry!). CSS <code>zoom</code> re-rasterizes at full fidelity.</p>
            <ul>
              <li><code>matrix(a, b, c, d, tx, ty)</code> — the 2D affine transform</li>
              <li>GPU-accelerated via <code>will-change: transform</code></li>
              <li>The key trick: <code>zoom</code> ≠ <code>scale()</code></li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'html-richtext',
          x: -180,
          y: 250,
          width: 500,
          height: 340,
          title: 'Rich Text',
          portalChar: 'R',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>HTML's superpower: <strong>rich text layout</strong>. Wrapping, hyphenation, bidirectional text, inline elements, lists — all for free.</p>
            <p>Try doing this with Canvas <code>fillText()</code> — you'd need thousands of lines of code for what the browser gives you in a <code>&lt;p&gt;</code> tag.</p>
            <ul>
              <li>Subpixel text rendering for crisp fonts</li>
              <li>Automatic line wrapping and justification</li>
              <li>Inline code, bold, italic — semantic markup</li>
            </ul>
          `,
          children: [],
        },
      ],
    },
    {
      id: 'canvas',
      x: 800,
      y: -500,
      width: 600,
      height: 380,
      title: 'Canvas',
      portalChar: 'C',
      level: 1,
      accentColor: LEVEL_COLORS[1],
      content: `
        <p>The <code>&lt;canvas&gt;</code> element draws the visual chrome behind the HTML: the dot grid, connection curves, and effects.</p>
        <p>Canvas excels at things that would be expensive in DOM — thousands of dots, bezier curves, particle effects.</p>
        <ul>
          <li>Dot grid scales fractally with zoom level</li>
          <li>Bezier curves connect parent and child nodes</li>
          <li>GPU-accelerated 2D rendering context</li>
        </ul>
        <pre><code>ctx.arc(x, y, 1.2, 0, Math.PI * 2);
ctx.fill();</code></pre>
      `,
      children: [
        {
          id: 'canvas-2d',
          x: -450,
          y: -350,
          width: 500,
          height: 340,
          title: '2D Context',
          portalChar: 'C',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>The <strong>CanvasRenderingContext2D</strong> is your drawing API. Paths, fills, strokes, images — all in immediate mode.</p>
            <p>Unlike the DOM's retained-mode tree, canvas is fire-and-forget: draw pixels, then they're just pixels.</p>
            <ul>
              <li><code>beginPath()</code>, <code>moveTo()</code>, <code>lineTo()</code>, <code>arc()</code></li>
              <li><code>fill()</code> and <code>stroke()</code> commit the path</li>
              <li><code>setTransform()</code> — the current transform matrix (CTM)</li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'canvas-bezier',
          x: 100,
          y: -350,
          width: 500,
          height: 340,
          title: 'Bezier Curves',
          portalChar: 'B',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p><strong>Cubic Bezier curves</strong> draw the smooth connection lines between parent and child nodes.</p>
            <p>Two control points shape the curve: we place them at vertical offsets to create elegant S-curves.</p>
            <ul>
              <li><code>bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)</code></li>
              <li>Control points at 40% vertical distance for natural flow</li>
              <li>Animated dash pattern: <code>setLineDash([8, 4])</code></li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'canvas-raf',
          x: -180,
          y: 250,
          width: 500,
          height: 340,
          title: 'requestAnimationFrame',
          portalChar: 'A',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p><code>requestAnimationFrame</code> is the heartbeat of canvas rendering. It fires before each repaint — typically 60 or 144 times per second.</p>
            <p>We only redraw when the camera moves (dirty flag), so idle frames cost nothing.</p>
            <ul>
              <li>Synced to the display refresh rate</li>
              <li>Automatically paused in background tabs</li>
              <li>Callback gets a high-resolution timestamp</li>
            </ul>
          `,
          children: [],
        },
      ],
    },
    {
      id: 'camera',
      x: -800,
      y: 500,
      width: 600,
      height: 380,
      title: 'The Camera',
      portalChar: 'C',
      level: 1,
      accentColor: LEVEL_COLORS[1],
      content: `
        <p>A single camera state <code>{ x, y, zoom }</code> drives both the Canvas and HTML layers simultaneously.</p>
        <p>The camera defines what slice of the infinite 2D universe is visible on screen.</p>
        <ul>
          <li>Zoom toward cursor — the point under your mouse stays fixed</li>
          <li>CSS <code>transform: matrix()</code> positions all HTML nodes</li>
          <li>Canvas applies the same matrix to its drawing context</li>
        </ul>
        <pre><code>worldX = (screenX - vw/2) / zoom + cam.x
worldY = (screenY - vh/2) / zoom + cam.y</code></pre>
      `,
      children: [
        {
          id: 'camera-world',
          x: -450,
          y: -350,
          width: 500,
          height: 340,
          title: 'World Space',
          portalChar: 'W',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p><strong>World space</strong> is the infinite coordinate system where all nodes live. It never changes — only the camera moves through it.</p>
            <p>Node positions are fixed world coordinates. The camera's (x, y) determines which part of world space is centered on screen.</p>
            <ul>
              <li>Origin (0, 0) is where the root node sits</li>
              <li>Positive X → right, positive Y → down</li>
              <li>Units are pixels at zoom = 1</li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'camera-screen',
          x: 100,
          y: -350,
          width: 500,
          height: 340,
          title: 'Screen Space',
          portalChar: 'S',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p><strong>Screen space</strong> is what you see — the viewport. (0, 0) is the top-left corner of the browser window.</p>
            <p>The camera transform maps world → screen: translate by camera position, then scale by zoom.</p>
            <ul>
              <li>screenX = (worldX - cam.x) × zoom + vw/2</li>
              <li>screenY = (worldY - cam.y) × zoom + vh/2</li>
              <li>Inverse: worldX = (screenX - vw/2) / zoom + cam.x</li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'camera-stack',
          x: -180,
          y: 250,
          width: 500,
          height: 340,
          title: 'The Transform Stack',
          portalChar: 'T',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>Each zoom level has its own coordinate system. The <strong>transform stack</strong> accumulates parent transforms to position deeply nested nodes.</p>
            <p>When you zoom into level 2, the camera sees: rootTransform × level1Transform × localPosition.</p>
            <ul>
              <li>Push transform when zooming into a portal</li>
              <li>Pop transform when zooming back out</li>
              <li>Matrix multiplication composes all levels</li>
            </ul>
          `,
          children: [],
        },
      ],
    },
    {
      id: 'react',
      x: 800,
      y: 500,
      width: 600,
      height: 380,
      title: 'React',
      portalChar: 'R',
      level: 1,
      accentColor: LEVEL_COLORS[1],
      content: `
        <p>React manages the node tree and decides what to render at each zoom level.</p>
        <p>A <strong>Level of Detail</strong> (LOD) system ensures only nearby nodes render full HTML — distant nodes become simple dots or cards.</p>
        <ul>
          <li>LOD tiers: hidden → dot → card → full → zoomed-past</li>
          <li><code>React.memo</code> prevents unnecessary re-renders</li>
          <li>Only ~10-20 full HTML nodes in the DOM at any time</li>
        </ul>
        <pre><code>const lod = useLOD(node, camera);
if (lod === 'hidden') return null;</code></pre>
      `,
      children: [
        {
          id: 'react-vdom',
          x: -450,
          y: -350,
          width: 500,
          height: 340,
          title: 'Virtual DOM',
          portalChar: 'V',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>React's <strong>Virtual DOM</strong> is a lightweight JavaScript representation of the real DOM.</p>
            <p>On each render, React diffs the new VDOM against the old one and applies only the minimal set of real DOM mutations.</p>
            <ul>
              <li>O(n) tree diffing via heuristic assumptions</li>
              <li>Keys help React track identity across re-renders</li>
              <li>Batched updates minimize layout thrashing</li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'react-memo',
          x: 100,
          y: -350,
          width: 500,
          height: 340,
          title: 'Memoization',
          portalChar: 'M',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p><code>React.memo</code> wraps a component to skip re-renders when props haven't changed.</p>
            <p>For this demo, node content is static — memo ensures we only re-render when LOD tier changes.</p>
            <ul>
              <li><code>useMemo</code> for expensive derived values</li>
              <li><code>useCallback</code> for stable function references</li>
              <li>Ref-based camera avoids render cycles entirely</li>
            </ul>
          `,
          children: [],
        },
        {
          id: 'react-lod',
          x: -180,
          y: 250,
          width: 500,
          height: 340,
          title: 'LOD Hooks',
          portalChar: 'L',
          level: 2,
          accentColor: LEVEL_COLORS[2],
          content: `
            <p>Custom hooks calculate the <strong>Level of Detail</strong> tier for each node based on its apparent screen size.</p>
            <p>Nodes far from the camera render as dots. Close nodes render full HTML. This keeps the DOM budget under ~20 elements.</p>
            <ul>
              <li>hidden → dot → card → full → zoomed-past</li>
              <li>Viewport culling: off-screen nodes unmount entirely</li>
              <li>Apparent size = node.width × camera.zoom</li>
            </ul>
          `,
          children: [],
        },
      ],
    },
  ],
};
