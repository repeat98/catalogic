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

const Track = ({ track, columns, isSelected, onTrackClick, onPlayClick, isPlaying, isCurrentTrack }) => {
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

  const handlePlayButtonClick = (e) => {
    if (onPlayClick) {
      e.stopPropagation(); // Prevent row selection
      onPlayClick(e);
    }
  };

  return (
    <tr
      className={`TrackRow ${isSelected ? 'Selected' : ''} ${isCurrentTrack ? 'CurrentPlayingTrack' : ''}`}
      onClick={handleMainClick}
      onDoubleClick={handleDoubleClick}
    >
      {columns.map((col) => {
        let content = track[col.key] !== undefined && track[col.key] !== null ? track[col.key] : '-';
        if (col.key === 'time') {
          content = formatTime(track[col.key]);
        }

        return (
          <td key={col.key} className={`TrackCell Cell-${col.key}`} style={{ width: col.currentWidth || col.width }}>
            {col.type === 'image' ? (
              <img
                src={track[col.key] || 'assets/default-artwork.png'} // Updated default path
                alt="artwork"
                className="TrackArtworkThumbnail"
                onError={(e) => { e.target.src = 'assets/default-artwork.png'; }} // Updated fallback
              />
            ) : (
              content
            )}
          </td>
        );
      })}
      {onPlayClick && (
        <td className="TrackCell Cell-playAction" style={{ width: '50px' }}>
          <button onClick={handlePlayButtonClick} className="PlayButton" aria-label={`Play ${track.title}`}>
            {isCurrentTrack && isPlaying ? '❚❚' : '▶'}
          </button>
        </td>
      )}
    </tr>
  );
};

export default Track;