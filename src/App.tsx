import { useRef, useState, useMemo } from 'react';
import { useCamera } from './hooks/useCamera';
import { useGestures } from './hooks/useGestures';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { DebugPane } from './components/DebugPane';
import { DEFAULT_LEVELS } from './levels';
import type { ZoomLevel } from './levels';
import './index.css';

const NEST_SCALE = 1 / 1000;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [levels] = useState<ZoomLevel[]>(DEFAULT_LEVELS);
  const [nestScale, setNestScale] = useState(NEST_SCALE);

  // Auto-compute max zoom so you can always reach the deepest level
  // (need to zoom in by 1/nestScale per level)
  const autoMaxZoom = useMemo(
    () => Math.pow(1 / nestScale, levels.length - 1) * 2, // 2x headroom
    [nestScale, levels.length],
  );

  const [debugValues, setDebugValues] = useState({
    nestScale: NEST_SCALE,
    minZoom: 0.0001,
    maxZoom: autoMaxZoom,
  });

  // When nest scale changes from debug pane, update the auto max zoom too
  const handleDebugChange = (v: typeof debugValues) => {
    if (v.nestScale !== debugValues.nestScale) {
      const newMax = Math.pow(1 / v.nestScale, levels.length - 1) * 2;
      setNestScale(v.nestScale);
      setDebugValues({ ...v, maxZoom: newMax });
    } else {
      setDebugValues(v);
    }
  };

  const limitsRef = useRef({ minZoom: debugValues.minZoom, maxZoom: debugValues.maxZoom });
  limitsRef.current = { minZoom: debugValues.minZoom, maxZoom: debugValues.maxZoom };

  const camera = useCamera(limitsRef);
  useGestures(containerRef, camera);

  return (
    <div ref={containerRef} className="viewport">
      <InfiniteCanvas
        cameraRef={camera.cameraRef}
        subscribe={camera.subscribe}
        nestScale={nestScale}
        levels={levels}
      />
      <DebugPane
        cameraRef={camera.cameraRef}
        subscribe={camera.subscribe}
        values={debugValues}
        onValuesChange={handleDebugChange}
        setCameraTo={camera.setCameraTo}
        levels={levels}
        nestScale={nestScale}
      />
    </div>
  );
}
