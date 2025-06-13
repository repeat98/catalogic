import React, { useCallback, useState, useEffect } from 'react';
import './TempPlaylist.scss';
import TrackPreview from './TrackPreview';

const TempPlaylist = ({ 
  selectedTracks = [], 
  onClearSelection = () => {},
  onTrackClick = () => {},
  onTrackDoubleClick = () => {},
  onRemoveTrack = () => {},
  className = '',
  // Waveform-related props (matching collection tab pattern)
  currentPlayingTrackId,
  isAudioPlaying = false,
  currentTime = 0,
  onSeek,
  onPlayTrack,
  onPendingSeek
}) => {
  // State to manage which tracks are selected within the playlist (default: all selected)
  const [playlistSelectedTracks, setPlaylistSelectedTracks] = useState(
    new Set(selectedTracks.map(track => track.id))
  );

  // Update playlist selection when selectedTracks changes (new tracks added)
  useEffect(() => {
    setPlaylistSelectedTracks(prev => {
      const newSet = new Set(prev);
      // Add new tracks to selection (default selected)
      selectedTracks.forEach(track => {
        if (track.id) {
          newSet.add(track.id);
        }
      });
      // Remove tracks that are no longer in the list
      const currentTrackIds = new Set(selectedTracks.map(track => track.id));
      for (const trackId of newSet) {
        if (!currentTrackIds.has(trackId)) {
          newSet.delete(trackId);
        }
      }
      return newSet;
    });
  }, [selectedTracks]);
  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    onClearSelection();
  }, [onClearSelection]);

  // Handle track click (toggle selection)
  const handleTrackClick = useCallback((track, event) => {
    setPlaylistSelectedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(track.id)) {
        newSet.delete(track.id);
      } else {
        newSet.add(track.id);
      }
      return newSet;
    });
    onTrackClick(track, event);
  }, [onTrackClick]);

  // Handle track double click
  const handleTrackDoubleClick = useCallback((track, event) => {
    onTrackDoubleClick(track, event);
  }, [onTrackDoubleClick]);

  // Handle track removal (right-click or keyboard shortcut)
  const handleTrackRemove = useCallback((track) => {
    onRemoveTrack(track);
  }, [onRemoveTrack]);

  // Build CSS classes
  const containerClasses = [
    'temp-playlist',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="header">
        <div className="selected-tracks-count">
          Selected Tracks ({selectedTracks.length})
        </div>
        <button 
          className="clear-selection-button"
          onClick={handleClearSelection}
          disabled={selectedTracks.length === 0}
          aria-label="Clear all selected tracks"
        >
          <div className="clear">Clear</div>
        </button>
      </div>
      
      <div className="tracks-container">
        {selectedTracks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-message">No tracks selected</div>
            <div className="empty-hint">Select tracks from the visualizer to add them here</div>
          </div>
        ) : (
          selectedTracks.map((track, index) => {
            const selectedForDrag = selectedTracks.filter(t => playlistSelectedTracks.has(t.id));

            return (
              <TrackPreview
                key={track.id || index}
                track={track}
                isSelected={playlistSelectedTracks.has(track.id)}
                onClick={handleTrackClick}
                onDoubleClick={handleTrackDoubleClick}
                className="temp-playlist-track"
                // Pass selected tracks for drag-and-drop
                selectedTracksForDrag={selectedForDrag}
                // Pass waveform-related props
                currentPlayingTrackId={currentPlayingTrackId}
                isAudioPlaying={isAudioPlaying}
                currentTime={currentTime}
                onSeek={onSeek}
                onPlayTrack={onPlayTrack}
                onPendingSeek={onPendingSeek}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default TempPlaylist;
