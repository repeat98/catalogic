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
  // Autocomplete Search Props
  searchTerm,
  onSearchInputChange,
  autocompleteSuggestions,
  onSuggestionClick,
  onExecuteSearch,
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
        searchTerm={searchTerm}
        onSearchInputChange={onSearchInputChange}
        suggestions={autocompleteSuggestions}
        onSuggestionClick={onSuggestionClick}
        onExecuteSearch={onExecuteSearch}
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
        // Pass feature category props to Tracklist
        selectedFeatureCategory={selectedFeatureCategory}
        onFeatureCategoryChange={onFeatureCategoryChange}
      />
    </div>
  );
};

export default Content;