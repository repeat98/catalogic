import React from 'react';
import './Track.scss';

// Helper to format time from seconds or MM:SS string
const formatTime = (time) => {
  if (typeof time === 'number') {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
  if (typeof time === 'string' && time.includes(':')) {
    return time;
  }
  return time || '-';
};

const Track = ({ 
  track, 
  columns, 
  isSelected, 
  onTrackClick, 
  onPlayClick, 
  isPlaying, 
  isCurrentTrack, 
  renderCell, 
  onDragStart,
  viewMode,
  onRemoveTrackFromTag,
  selectedTagId
}) => {
  const handleMainClick = () => {
    if (onTrackClick) {
      onTrackClick();
    }
  };

  const handleDoubleClick = (e) => {
    if (onPlayClick) {
      e.stopPropagation(); // Prevent row selection from firing again if it's already selected
      onPlayClick(e);
    }
  };

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e, track);
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemoveTrackFromTag && selectedTagId) {
      onRemoveTrackFromTag(selectedTagId, track.id);
    }
  };

  return (
    <tr
      className={`TrackRow ${isSelected ? 'Selected' : ''} ${isCurrentTrack ? 'CurrentPlayingTrack' : ''}`}
      onClick={handleMainClick}
      onDoubleClick={handleDoubleClick}
      draggable={true}
      onDragStart={handleDragStart}
    >
      {columns.map((col) => {
        let content;
        
        // Use renderCell function if provided, otherwise use default rendering
        if (renderCell) {
          content = renderCell(track, col);
        } else {
          content = track[col.key] !== undefined && track[col.key] !== null ? track[col.key] : '-';
          if (col.key === 'time') {
            content = formatTime(track[col.key]);
          }
          
          if (col.type === 'image') {
            content = (
              <img
                src={track[col.key] || 'assets/default-artwork.png'}
                alt="artwork"
                className="TrackArtworkThumbnail"
                onError={(e) => { e.target.src = 'assets/default-artwork.png'; }}
              />
            );
          }
        }

        return (
          <td key={col.key} className={`TrackCell Cell-${col.key}`} style={{ width: col.currentWidth || col.width }}>
            {content}
          </td>
        );
      })}
      {viewMode === 'tag' && onRemoveTrackFromTag && (
        <td className="TrackCell TrackActions">
          <button 
            className="RemoveButton"
            onClick={handleRemoveClick}
            title="Remove from tag"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  );
};

export default Track;