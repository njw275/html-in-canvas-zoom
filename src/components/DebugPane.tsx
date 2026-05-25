import { useEffect, useState } from 'react';
import type { Camera } from '../utils/math';
import type { ZoomLevel } from '../levels';
import { splitAtPortal, levelLabel, isImageLevel } from '../levels';

interface DebugValues {
  nestScale: number;
  minZoom: number;
  maxZoom: number;
}

interface Props {
  cameraRef: React.RefObject<Camera>;
  subscribe: (cb: () => void) => () => void;
  values: DebugValues;
  onValuesChange: (v: DebugValues) => void;
  setCameraTo: (x: number, y: number, zoom: number) => void;
  levels: ZoomLevel[];
  nestScale: number;
}

export function DebugPane({ cameraRef, subscribe, values, onValuesChange, setCameraTo, levels, nestScale }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    const unsub = subscribe(() => {
      const c = cameraRef.current!;
      setCam({ x: c.x, y: c.y, zoom: c.zoom });
    });
    const c = cameraRef.current!;
    setCam({ x: c.x, y: c.y, zoom: c.zoom });
    return unsub;
  }, [cameraRef, subscribe]);

  const handleZoomInput = (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      setCameraTo(cameraRef.current!.x, cameraRef.current!.y, n);
    }
  };

  const handleXInput = (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setCameraTo(n, cameraRef.current!.y, cameraRef.current!.zoom);
    }
  };

  const handleYInput = (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setCameraTo(cameraRef.current!.x, n, cameraRef.current!.zoom);
    }
  };

  const resetCamera = () => setCameraTo(0, 0, 1);

  const stopProp = (e: React.PointerEvent | React.MouseEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  // Compute the zoom needed to read each level
  const levelZooms = levels.map((_, i) => Math.pow(1 / nestScale, i));

  // Determine which level is "active" (closest readable at current zoom)
  const activeLevel = levelZooms.reduce((best, z, i) =>
    cam.zoom >= z * 0.3 ? i : best, 0);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        onPointerDown={stopProp}
        data-no-drag
        style={toggleBtnStyle}
        title="Open debug pane"
      >
        🔧
      </button>
    );
  }

  return (
    <div style={panelStyle} data-no-drag onPointerDown={stopProp} onMouseDown={stopProp} onWheel={stopProp}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>🔧 Debug</span>
        <button onClick={() => setCollapsed(true)} style={closeBtnStyle}>✕</button>
      </div>

      {/* Camera */}
      <Section title="Camera">
        <Row label="X">
          <NumberInput value={cam.x} onChange={handleXInput} step={10} />
        </Row>
        <Row label="Y">
          <NumberInput value={cam.y} onChange={handleYInput} step={10} />
        </Row>
        <Row label="Zoom">
          <NumberInput value={cam.zoom} onChange={handleZoomInput} step={0.1} />
        </Row>
        <Row label="Zoom (log₁₀)">
          <input
            type="range"
            min={Math.log10(values.minZoom)}
            max={Math.log10(values.maxZoom)}
            step={0.01}
            value={Math.log10(cam.zoom)}
            onChange={(e) => handleZoomInput(String(Math.pow(10, parseFloat(e.target.value))))}
            style={sliderStyle}
          />
          <span style={valStyle}>{Math.log10(cam.zoom).toFixed(2)}</span>
        </Row>
        <button onClick={resetCamera} style={smallBtnStyle}>Reset to origin</button>
      </Section>

      {/* Levels - jump to each one */}
      <Section title={`Levels (${levels.length})`}>
        {levels.map((level, i) => {
          const z = levelZooms[i];
          const split = splitAtPortal(level);
          const isActive = i === activeLevel;
          const isImg = isImageLevel(level);
          return (
            <div
              key={i}
              onClick={() => setCameraTo(cameraRef.current!.x, cameraRef.current!.y, z)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 6px',
                marginBottom: 2,
                borderRadius: 4,
                cursor: 'pointer',
                background: isActive ? 'rgba(124,124,255,0.2)' : 'transparent',
                border: isActive ? '1px solid rgba(124,124,255,0.4)' : '1px solid transparent',
              }}
            >
              <span style={{ fontSize: 10, color: '#888', width: 16, flexShrink: 0 }}>L{i}</span>
              <span style={{ fontSize: 11, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isImg ? (
                  <>
                    <span style={{ color: '#8cf' }}>{levelLabel(level)}</span>
                    {level.portalPosition && (
                      <span style={{ color: '#ff8', fontSize: 9 }}>
                        {' '}@{level.portalPosition.x},{level.portalPosition.y}%
                      </span>
                    )}
                  </>
                ) : split ? (
                  <>
                    {split.before}
                    <span style={{ color: '#ff8', fontWeight: 700 }}>{split.portal}</span>
                    {split.after}
                  </>
                ) : level.text}
              </span>
              <span style={{ fontSize: 9, color: '#8f8', flexShrink: 0 }}>
                {z >= 1000 ? z.toExponential(0) : z}x
              </span>
            </div>
          );
        })}
        <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
          Click a level to jump to its zoom
        </div>
      </Section>

      {/* Nest Scale */}
      <Section title="Nest Scale">
        <Row label="Scale">
          <input
            type="range"
            min={-4}
            max={-1}
            step={0.01}
            value={Math.log10(values.nestScale)}
            onChange={(e) =>
              onValuesChange({ ...values, nestScale: Math.pow(10, parseFloat(e.target.value)) })
            }
            style={sliderStyle}
          />
          <span style={valStyle}>1/{(1 / values.nestScale).toFixed(0)}</span>
        </Row>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
          Each level readable at {(1 / values.nestScale).toFixed(0)}x of parent
        </div>
      </Section>

      {/* Zoom Limits */}
      <Section title="Zoom Limits">
        <Row label="Min">
          <input
            type="range"
            min={-6}
            max={0}
            step={0.1}
            value={Math.log10(values.minZoom)}
            onChange={(e) =>
              onValuesChange({ ...values, minZoom: Math.pow(10, parseFloat(e.target.value)) })
            }
            style={sliderStyle}
          />
          <span style={valStyle}>{values.minZoom.toExponential(1)}</span>
        </Row>
        <Row label="Max">
          <span style={{ fontSize: 10, color: '#888' }}>
            Auto: {values.maxZoom.toExponential(1)} (from {levels.length} levels)
          </span>
        </Row>
      </Section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', marginBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <span style={{ width: 65, fontSize: 11, color: '#ccc', flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step = 1,
}: {
  value: number;
  onChange: (v: string) => void;
  step?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const display = Math.abs(value) < 0.001 && value !== 0
    ? value.toExponential(2)
    : value.toFixed(Math.abs(value) < 10 ? 3 : 1);

  return editing ? (
    <input
      autoFocus
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { onChange(text); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onChange(text); setEditing(false); }
        if (e.key === 'Escape') setEditing(false);
        e.stopPropagation();
      }}
      style={inputStyle}
    />
  ) : (
    <span
      onClick={() => { setText(display); setEditing(true); }}
      style={{ ...valStyle, cursor: 'text', borderBottom: '1px dashed #666' }}
      title="Click to edit"
    >
      {display}
    </span>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  width: 270,
  background: 'rgba(20, 20, 30, 0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '10px 14px 14px',
  color: '#e0e0e0',
  fontFamily: 'monospace',
  fontSize: 12,
  zIndex: 9999,
  maxHeight: 'calc(100vh - 24px)',
  overflowY: 'auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
  paddingBottom: 6,
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 6px',
};

const toggleBtnStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  width: 36,
  height: 36,
  background: 'rgba(20, 20, 30, 0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e0e0e0',
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  height: 3,
  accentColor: '#7c7cff',
};

const valStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#8f8',
  minWidth: 50,
  textAlign: 'right',
};

const inputStyle: React.CSSProperties = {
  width: 80,
  background: '#222',
  border: '1px solid #555',
  borderRadius: 3,
  color: '#8f8',
  fontSize: 11,
  padding: '2px 4px',
  fontFamily: 'monospace',
};

const smallBtnStyle: React.CSSProperties = {
  background: '#333',
  border: '1px solid #555',
  borderRadius: 4,
  color: '#ccc',
  cursor: 'pointer',
  fontSize: 10,
  padding: '3px 8px',
};
