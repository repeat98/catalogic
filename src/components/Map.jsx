import React, { lazy, Suspense } from 'react';
import './Map.scss';

const TrackVisualizerRefactored = lazy(() => import('./TrackVisualizerRefactored'));

const Map = ({
  // Playback props (matching Tracklist pattern)
  onPlayTrack,
  currentPlayingTrackId,
  isAudioPlaying,
  currentTime,
  onSeek
}) => {
  return (
    <div className="Map">
      <Suspense fallback={<div>Loading…</div>}>
        <TrackVisualizerRefactored
          onPlayTrack={onPlayTrack}
          currentPlayingTrackId={currentPlayingTrackId}
          isAudioPlaying={isAudioPlaying}
          currentTime={currentTime}
          onSeek={onSeek}
        />
      </Suspense>
    </div>
  );
};

export default Map; 