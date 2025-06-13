import React, { lazy, Suspense } from 'react';
import './Map.scss';

const TrackVisualizerRefactored = lazy(() => import('./TrackVisualizerRefactored'));

const Map = ({
  // Playback props (matching Tracklist pattern)
  onPlayTrack,
  currentPlayingTrackId,
  isAudioPlaying,
  currentTime,
  onSeek,
  // Filtering props for crates/tags
  crates,
  tags,
  selectedCrateId,
  selectedTagId,
  viewMode,
  // Callback props for changing collection filters
  onCrateSelect,
  onTagSelect,
  onViewModeChange
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
          // Pass filtering props
          crates={crates}
          tags={tags}
          selectedCrateId={selectedCrateId}
          selectedTagId={selectedTagId}
          viewMode={viewMode}
          // Pass callback props
          onCrateSelect={onCrateSelect}
          onTagSelect={onTagSelect}
          onViewModeChange={onViewModeChange}
        />
      </Suspense>
    </div>
  );
};

export default Map; 