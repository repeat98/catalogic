import React from 'react';
import defaultArtwork from "../../assets/default-artwork.png";
import WaveformPreview from './WaveformPreview';
import { DARK_MODE_SURFACE_ALT, DARK_MODE_TEXT_PRIMARY, DARK_MODE_BORDER } from '../utils/constants.js';

const Tooltip = React.forwardRef(({ 
  track, 
  position, 
  onMouseLeave,
  // Waveform props
  currentPlayingTrackId,
  isAudioPlaying,
  currentTime,
  onSeek,
  onPlayTrack
}, ref) => {
  if (!track || !position) return null;

  // Get display title - use filename without suffix if title is "Unknown Title"
  const displayTitle = track.title === 'Unknown Title' && track.path ? 
    track.path.split('/').pop().replace(/\.[^/.]+$/, '') : 
    (track.title || 'Unknown Title');

  const audioPath = track.audioUrl || (track.path ? `http://localhost:3000/audio/${track.id}` : null);

  const handlePlayClick = () => {
    if (onPlayTrack) {
      onPlayTrack(track);
    }
  };

  // Calculate position with viewport boundary checks
  const calculatePosition = () => {
    const tooltipWidth = 300; // maxWidth from CSS
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = position.x;
    let y = position.y - 4; // 4px above the dot
    let transform = 'translate(-50%, -100%)'; // Center horizontally and position above
    
    // Check if tooltip would go off the left edge
    if (x - tooltipWidth / 2 < 10) {
      x = tooltipWidth / 2 + 10;
    }
    
    // Check if tooltip would go off the right edge
    if (x + tooltipWidth / 2 > viewportWidth - 10) {
      x = viewportWidth - tooltipWidth / 2 - 10;
    }
    
    // Check if tooltip would go off the top edge
    // If so, position it below the dot instead
    if (y < 10) {
      y = position.y + 4; // 4px below the dot
      transform = 'translate(-50%, 0%)'; // Position below instead of above
    }
    
    return { x, y, transform };
  };

  const { x, y, transform } = calculatePosition();

  return (
    <div 
      ref={ref}
      className="track-tooltip" 
      style={{ 
        top: y,
        left: x,
        position: 'fixed',
        transform: transform,
        zIndex: 1000,
        backgroundColor: DARK_MODE_SURFACE_ALT,
        color: DARK_MODE_TEXT_PRIMARY,
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        pointerEvents: 'auto',
        border: `1px solid ${DARK_MODE_BORDER}`,
        maxWidth: '300px'
      }} 
      role="tooltip"
      onMouseLeave={onMouseLeave}
    >
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <img
          src={track.artwork_thumbnail_path || defaultArtwork}
          alt={`${track.artist || 'Unknown'} - ${displayTitle}`}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultArtwork;
            e.target.style.opacity = '0.7';
          }}
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'cover',
            borderRadius: '4px',
            transition: 'opacity 0.2s ease',
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {displayTitle}
          </div>
          <div style={{ marginBottom: '4px' }}>
            {track.artist || 'Unknown Artist'}
          </div>
          <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>
            {track.album || 'Unknown Album'} ({track.year || 'N/A'})
          </div>
          <div style={{ marginBottom: '4px' }}>
            BPM: {track.bpm?.toFixed(1) || 'N/A'}, Key: {track.key || 'N/A'}
          </div>
          {track.tag1 && (
            <div>
              Genre: {track.tag1} ({track.tag1_prob?.toFixed(2) || 'N/A'})
            </div>
          )}
        </div>
      </div>
      {audioPath && (
        <div className="waveform-container" style={{ width: '100%', height: '40px' }}>
          <WaveformPreview
            trackId={track.id}
            isPlaying={currentPlayingTrackId === track.id && isAudioPlaying}
            currentTime={currentPlayingTrackId === track.id ? currentTime : 0}
            onSeek={onSeek}
            onPlayClick={handlePlayClick}
          />
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
Tooltip.displayName = 'Tooltip';

export default Tooltip; 