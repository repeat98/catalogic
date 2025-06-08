import React, { lazy, Suspense } from 'react';
import './Map.scss';

const TrackVisualizer = lazy(() => import('./TrackVisualizer'));

const Map = () => {
  return (
    <div className="Map">
      <Suspense fallback={<div>Loading…</div>}>
        <TrackVisualizer />
      </Suspense>
    </div>
  );
};

export default Map; 