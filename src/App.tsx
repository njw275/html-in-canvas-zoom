import { useRef } from 'react';
import { useCamera } from './hooks/useCamera';
import { useGestures } from './hooks/useGestures';
import { CanvasLayer } from './components/CanvasLayer';
import './index.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const camera = useCamera();

  useGestures(containerRef, camera);

  return (
    <div ref={containerRef} className="viewport">
      <CanvasLayer cameraRef={camera.cameraRef} subscribe={camera.subscribe} />
      {/* HTML layer will go here in Phase 2 */}
    </div>
  );
}
