import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import Tracklist from './Tracklist';
import SearchComponent from './SearchComponent'; // Import the new component
import './Content.scss';

const Content = ({ // Destructure props passed from Main
  filteredTracks,
  selectedTrackId,
  currentPlayingTrack,
  isPlaying,
  audioError,
  onTrackSelect,
  onPlayTrack,
  onSearch,
  isLoading,
  error
}) => {
  // Removed: allTracks, currentPlayingTrack, error, isLoading states
  // Removed: isPlaying, audioPlayerRef, audioError states
  // Removed: fetchTracks useEffect
  // Removed: handlePlayTrack (will be in Main)
  // Removed: Audio element event handlers useEffect

  if (isLoading) {
    return <div className="ContentLoading">Loading tracks...</div>;
  }

  if (error) {
    return <div className="ContentError">Error loading tracks: {error}. Make sure the backend server is running.</div>;
  }

  return (
    <div data-layer="content" className="Content">
      <SearchComponent onSearch={onSearch} />
      <Tracklist
        tracks={filteredTracks}
        selectedTrackId={selectedTrackId}
        onTrackSelect={onTrackSelect}
        onPlayTrack={onPlayTrack} // Pass the handler from Main
        currentPlayingTrackId={currentPlayingTrack?.id}
        isAudioPlaying={isPlaying}
      />
      {/* Removed: <audio> element and MiniPlayerInfo */}
    </div>
  );
};

export default Content;