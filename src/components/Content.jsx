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
  // Updated Search props
  searchTerm,
  onSearchTermChange,
  // Feature Column Props
  selectedFeatureCategory,
  onFeatureCategoryChange,
  // Sorting props
  sortConfig,
  requestSort
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
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange} // Pass this instead of onSearch/onExecuteSearch
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
        // Pass sorting props to Tracklist
        sortConfig={sortConfig}
        requestSort={requestSort}
      />
    </div>
  );
};

export default Content;