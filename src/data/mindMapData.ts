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
  portalChar: 'O',
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
    <p>Zoom into the letter <strong>"O"</strong> in any title to find what's hidden inside...</p>
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
      children: [],
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
      children: [],
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
      children: [],
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
      children: [],
    },
  ],
};
