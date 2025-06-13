import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import './TrackPreview.scss';
import defaultArtwork from "../../assets/default-artwork.png";
import WaveformPreview from './WaveformPreview';
import { PlaybackContext } from '../context/PlaybackContext';

const TrackPreview = ({ 
  track = {}, 
  isSelected = false, 
  onClick = () => {}, 
  onDoubleClick = () => {},
  className = '',
  selectedTracksForDrag = [],
  // Waveform-related props (matching collection tab pattern)
  currentPlayingTrackId,
  isAudioPlaying = false,
  currentTime = 0,
  onSeek,
  onPlayTrack,
  onPendingSeek
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use the global PlaybackContext
  const { currentTrack, setCurrentTrack } = useContext(PlaybackContext);

  // Extract track data with fallbacks
  const title = track.title === 'Unknown Title' && track.path ? 
    track.path.split('/').pop().replace(/\.[^/.]+$/, '') : 
    (track.title || 'Unknown Title');
  const artist = track.artist || 'Unknown Artist';
  const imageSrc = track.artwork_thumbnail_path || track.coverImage || defaultArtwork;
  
  // Calculate audio path for waveform (same logic as in tooltip)
  const audioPath = track.audioUrl || (track.path ? `http://localhost:3000/audio/${track.id}` : null);

  // Handle mouse events
  const handleMouseDown = useCallback((e) => {
    setIsPressed(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((e) => {
    onClick(track, e);
  }, [onClick, track]);

  const handleDoubleClick = useCallback((e) => {
    onDoubleClick(track, e);
  }, [onDoubleClick, track]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(track, e);
    }
  }, [onClick, track]);

  // Store drag data in ref for access in drag end
  const dragDataRef = useRef(null);
  const dragStartPos = useRef(null);
  const hasDragged = useRef(false);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(true);
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    

    
    // Set drag data - include all selected tracks
    const dragData = {
      trackId: track.id,
      trackData: track,
      selectedTracks: selectedTracksForDrag
    };
    
    // Store in ref for later use
    dragDataRef.current = dragData;
    
    // Set data transfer for compatibility
    e.dataTransfer.setData('text/plain', JSON.stringify({
      trackId: track.id,
      trackData: track
    }));
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image showing count if multiple tracks
    if (selectedTracksForDrag.length > 1) {
      const dragImage = document.createElement('div');
      dragImage.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        background: #6A82FB;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 14px;
        z-index: 9999;
        pointer-events: none;
      `;
      dragImage.textContent = `${selectedTracksForDrag.length} tracks`;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 50, 15);
      
      // Remove drag image after drag starts
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
    }
  }, [track, selectedTracksForDrag]);

  // Handle drag (for visual feedback during drag)
  const handleDrag = useCallback((e) => {
    // Skip if coordinates are 0,0 (happens at the end of drag)
    if (e.clientX === 0 && e.clientY === 0) return;
    
    // Check if we've actually moved enough to consider it a drag
    if (dragStartPos.current) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.current.x, 2) + 
        Math.pow(e.clientY - dragStartPos.current.y, 2)
      );
      if (distance > 5) {
        hasDragged.current = true;
      }
    }
    
    // Get element under cursor for visual feedback
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    const menuItem = dropTarget?.closest('.MenuItemInstanceWrapper.DragTarget');
    
    // Remove previous hover states
    document.querySelectorAll('.MenuItemInstanceWrapper.DragTarget').forEach(item => {
      item.classList.remove('drag-over');
    });
    
    // Add hover state to current target
    if (menuItem) {
      menuItem.classList.add('drag-over');
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((e) => {
    const wasActualDrag = hasDragged.current;
    
    // Reset states
    setIsDragging(false);
    dragStartPos.current = null;
    hasDragged.current = false;
    
    // Remove all drag-over states
    document.querySelectorAll('.MenuItemInstanceWrapper.DragTarget').forEach(item => {
      item.classList.remove('drag-over');
    });
    
    // Only handle drop if it was an actual drag (not just a click)
    if (wasActualDrag) {
      // Check if we're over a valid drop target
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      if (dropTarget && dragDataRef.current) {
        const menuItem = dropTarget?.closest('.MenuItemInstanceWrapper.DragTarget');
        if (menuItem) {
          // Get tracks to process (selected tracks or just the dragged track)
          const tracksToProcess = dragDataRef.current.selectedTracks.length > 0 
            ? dragDataRef.current.selectedTracks 
            : [dragDataRef.current.trackData];
            
          // Dispatch a single event with all tracks to avoid race conditions
          const customDropEvent = new CustomEvent('trackDrop', {
            detail: {
              trackId: tracksToProcess[0].id, // Primary track for compatibility
              trackData: tracksToProcess[0], // Primary track data for compatibility
              allTracks: tracksToProcess, // All tracks to be added
              isMultiTrackDrop: tracksToProcess.length > 1
            }
          });
          menuItem.dispatchEvent(customDropEvent);
        }
      }
    }
    
    // Clear drag data
    dragDataRef.current = null;
  }, []);

  // Handle image error
  const handleImageError = useCallback((e) => {
    if (e.target.src !== defaultArtwork) {
      e.target.src = defaultArtwork;
    }
  }, []);

  // Handle waveform play - use the passed onPlayTrack function if available
  const handleWaveformPlay = useCallback(() => {
    if (onPlayTrack) {
      onPlayTrack(track);
    } else {
      // Fallback to context-based approach
      setCurrentTrack(track);
    }
  }, [track, onPlayTrack, setCurrentTrack]);

  // Check if this track is currently playing using passed props or context
  const isCurrentlyPlaying = currentPlayingTrackId ? 
    (currentPlayingTrackId === track.id && isAudioPlaying) :
    (currentTrack && currentTrack.id === track.id);

  // Current time for this track
  const trackCurrentTime = currentPlayingTrackId === track.id ? currentTime : 0;

  // Build CSS classes
  const containerClasses = [
    'track-preview',
    isSelected ? 'selected' : '',
    isDragging ? 'dragging' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      draggable={true}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`Track: ${title} by ${artist}`}
    >
      <div className="cover">
        <div className="coverarts">
          <img 
            className="imageIcon" 
            alt={`${artist} - ${title} artwork`}
            src={imageSrc}
            onError={handleImageError}
            draggable={false}
          />
        </div>
      </div>
      
      <div 
        className="waveform-container" 
        aria-label="Waveform visualization"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {track.id && (
          <WaveformPreview
            trackId={track.id}
            isPlaying={isCurrentlyPlaying}
            currentTime={trackCurrentTime}
            onSeek={onSeek}
            onPlayClick={handleWaveformPlay}
            onPendingSeek={onPendingSeek}
          />
        )}
      </div>
      
      <div className="track-info">
        <div className="tracktitel" title={title}>
          {title}
        </div>
        <div className="artist" title={artist}>
          {artist}
        </div>
      </div>
    </div>
  );
};

export default TrackPreview;
