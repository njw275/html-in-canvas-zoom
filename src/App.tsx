import { useRef, useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { useGestures } from './hooks/useGestures';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { DebugPane } from './components/DebugPane';
import './index.css';

const DEFAULT_DEBUG = {
  nestScale: 1 / 1000,
  minZoom: 0.0001,
  maxZoom: 1e7,
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugValues, setDebugValues] = useState(DEFAULT_DEBUG);
  const limitsRef = useRef({ minZoom: DEFAULT_DEBUG.minZoom, maxZoom: DEFAULT_DEBUG.maxZoom });

  // Keep limitsRef in sync with state
  limitsRef.current = { minZoom: debugValues.minZoom, maxZoom: debugValues.maxZoom };

  const camera = useCamera(limitsRef);
  useGestures(containerRef, camera);

  return (
    <div ref={containerRef} className="viewport">
      <InfiniteCanvas
        cameraRef={camera.cameraRef}
        subscribe={camera.subscribe}
        nestScale={debugValues.nestScale}
      />
      <DebugPane
        cameraRef={camera.cameraRef}
        subscribe={camera.subscribe}
        values={debugValues}
        onValuesChange={setDebugValues}
        setCameraTo={camera.setCameraTo}
      />
    </div>
  );
}
