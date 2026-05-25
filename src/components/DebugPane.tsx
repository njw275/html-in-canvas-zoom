import { useEffect, useRef, useState } from 'react';
import type { Camera } from '../utils/math';

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
  /** Imperatively set camera position + zoom */
  setCameraTo: (x: number, y: number, zoom: number) => void;
}

export function DebugPane({ cameraRef, subscribe, values, onValuesChange, setCameraTo }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const rafRef = useRef(0);

  // Subscribe to camera changes for live readout
  useEffect(() => {
    const unsub = subscribe(() => {
      const c = cameraRef.current!;
      setCam({ x: c.x, y: c.y, zoom: c.zoom });
    });
    // Initial read
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

  const resetCamera = () => {
    setCameraTo(0, 0, 1);
  };

  // Stop pointer events from reaching the canvas (no pan while clicking debug pane)
  const stopProp = (e: React.PointerEvent | React.MouseEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        onPointerDown={stopProp}
        style={toggleBtnStyle}
        title="Open debug pane"
      >
        🔧
      </button>
    );
  }

  return (
    <div
      style={panelStyle}
      onPointerDown={stopProp}
      onMouseDown={stopProp}
      onWheel={stopProp}
    >
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>🔧 Debug</span>
        <button onClick={() => setCollapsed(true)} style={closeBtnStyle}>✕</button>
      </div>

      {/* Camera readout */}
      <Section title="Camera">
        <Row label="X">
          <NumberInput value={cam.x} onChange={handleXInput} step={10} />
        </Row>
        <Row label="Y">
          <NumberInput value={cam.y} onChange={handleYInput} step={10} />
        </Row>
        <Row label="Zoom">
          <NumberInput value={cam.zoom} onChange={handleZoomInput} step={0.1} min={0.0001} />
        </Row>
        <Row label="Zoom (log₁₀)">
          <input
            type="range"
            min={-4}
            max={5}
            step={0.01}
            value={Math.log10(cam.zoom)}
            onChange={(e) => handleZoomInput(String(Math.pow(10, parseFloat(e.target.value))))}
            style={sliderStyle}
          />
          <span style={valStyle}>{Math.log10(cam.zoom).toFixed(2)}</span>
        </Row>
        <button onClick={resetCamera} style={smallBtnStyle}>Reset to origin</button>
      </Section>

      {/* Nest scale */}
      <Section title="Nest Scale">
        <Row label="Scale">
          <input
            type="range"
            min={-3}
            max={0}
            step={0.01}
            value={Math.log10(values.nestScale)}
            onChange={(e) =>
              onValuesChange({ ...values, nestScale: Math.pow(10, parseFloat(e.target.value)) })
            }
            style={sliderStyle}
          />
          <span style={valStyle}>1/{(1 / values.nestScale).toFixed(1)}</span>
        </Row>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
          Readable at ~{(1 / values.nestScale).toFixed(0)}x zoom
        </div>
      </Section>

      {/* Zoom limits */}
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
          <input
            type="range"
            min={2}
            max={7}
            step={0.1}
            value={Math.log10(values.maxZoom)}
            onChange={(e) =>
              onValuesChange({ ...values, maxZoom: Math.pow(10, parseFloat(e.target.value)) })
            }
            style={sliderStyle}
          />
          <span style={valStyle}>{values.maxZoom.toExponential(1)}</span>
        </Row>
      </Section>

      {/* Quick zoom presets */}
      <Section title="Quick Zoom">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[0.01, 0.1, 1, 5, 10, 30, 100, 1000].map((z) => (
            <button
              key={z}
              onClick={() => setCameraTo(cam.x, cam.y, z)}
              style={{
                ...smallBtnStyle,
                background: Math.abs(cam.zoom - z) < z * 0.05 ? '#555' : '#333',
              }}
            >
              {z}x
            </button>
          ))}
        </div>
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
  min,
}: {
  value: number;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
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
      onBlur={() => {
        onChange(text);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onChange(text);
          setEditing(false);
        }
        if (e.key === 'Escape') setEditing(false);
        e.stopPropagation();
      }}
      style={inputStyle}
    />
  ) : (
    <span
      onClick={() => {
        setText(display);
        setEditing(true);
      }}
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
  width: 260,
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
