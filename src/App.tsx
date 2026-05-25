import { useRef } from 'react';
import { useCamera } from './hooks/useCamera';
import { useGestures } from './hooks/useGestures';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import './index.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const camera = useCamera();

  useGestures(containerRef, camera);

  return (
    <div ref={containerRef} className="viewport">
      <InfiniteCanvas
        cameraRef={camera.cameraRef}
        subscribe={camera.subscribe}
      />
    </div>
  );
}
