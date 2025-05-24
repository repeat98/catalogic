import React from 'react';
import Tracklist from './Tracklist';
import SearchComponent from './SearchComponent';
import './Content.scss';

const Content = ({
  filteredTracks,
  selectedTrackId,
  currentPlayingTrack,
  isPlaying,
  currentTime,
  // audioError, // This prop was in the user's file but not used, remove if not needed
  onTrackSelect,
  onPlayTrack,
  onSeek,
  isLoading,
  error,
  // Search prop
  onSearch, // This will be executeSearch from Main
  // Feature Column Props
  selectedFeatureCategory,
  onFeatureCategoryChange
}) => {

  if (isLoading) {
    return <div className="ContentLoading">Loading tracks...</div>;
  }

  if (error) {
    return <div className="ContentError">Error loading tracks: {error}. Make sure the backend server is running.</div>;
  }

  return (
    <div data-layer="content" className="Content">
      <SearchComponent 
        onSearch={onSearch} // Pass the single onSearch prop
      />
      <Tracklist
        tracks={filteredTracks}
        selectedTrackId={selectedTrackId}
        onTrackSelect={onTrackSelect}
        onPlayTrack={onPlayTrack}
        currentPlayingTrackId={currentPlayingTrack?.id}
        isAudioPlaying={isPlaying}
        currentTime={currentTime}
        onSeek={onSeek}
        selectedFeatureCategory={selectedFeatureCategory}
        onFeatureCategoryChange={onFeatureCategoryChange}
      />
    </div>
  );
};

export default Content;