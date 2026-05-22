import { useRef } from 'react';
import { useCamera } from './hooks/useCamera';
import { useGestures } from './hooks/useGestures';
import { CanvasLayer } from './components/CanvasLayer';
import { HtmlLayer } from './components/HtmlLayer';
import { mindMapData } from './data/mindMapData';
import './index.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const camera = useCamera();

  useGestures(containerRef, camera);

  return (
    <div ref={containerRef} className="viewport">
      <CanvasLayer cameraRef={camera.cameraRef} subscribe={camera.subscribe} />
      <HtmlLayer
        cameraRef={camera.cameraRef}
        subscribe={camera.subscribe}
        rootNode={mindMapData}
      />
    </div>
  );
}
