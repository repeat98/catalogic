// src/context/PlaybackContext.jsx

import React, { createContext, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

export const PlaybackContext = createContext();

export const PlaybackProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const currentWaveSurfer = useRef(null);

  // Add logging wrapper for setCurrentTrack
  const setCurrentTrackWithLog = (track) => {
    console.log('[PlaybackContext] setCurrentTrack called:', {
      oldTrackId: currentTrack?.id,
      newTrackId: track?.id
    });
    setCurrentTrack(track);
  };

  /**
   * Sets the currently playing WaveSurfer instance.
   * Stops any previously playing instance and resets its progress.
   * @param {WaveSurfer} wavesurfer - The WaveSurfer instance to set as currently playing.
   */
  const setPlayingWaveSurfer = (newWaveSurferInstance) => {
    console.log('[PlaybackContext] setPlayingWaveSurfer called:', {
      hadPrevious: !!currentWaveSurfer.current,
      hasNew: !!newWaveSurferInstance,
      isSameInstance: currentWaveSurfer.current === newWaveSurferInstance
    });
    
    // Stop and reset the previous instance if it's different from the new one
    if (currentWaveSurfer.current && currentWaveSurfer.current !== newWaveSurferInstance) {
      try {
        console.log('[PlaybackContext] Stopping previous WaveSurfer');
        currentWaveSurfer.current.stop(); // This stops playback and resets progress
        currentWaveSurfer.current.setVolume(0);
      } catch (error) {
        console.warn('[Context] Error stopping previous WaveSurfer:', error);
      }
    }
    
    // Set the new instance as current
    currentWaveSurfer.current = newWaveSurferInstance;
    
    // Ensure the new instance has full volume (only for new instances)
    if (newWaveSurferInstance) {
      try {
        console.log('[PlaybackContext] Setting volume on new WaveSurfer');
        newWaveSurferInstance.setVolume(1);
      } catch (error) {
        console.warn('[Context] Error setting volume on new WaveSurfer:', error);
      }
    }
  };

  /**
   * Handles global keydown events.
   * Specifically listens for the spacebar to toggle play/pause.
   * Ensures that the event doesn't interfere when typing in inputs or textareas.
   * @param {KeyboardEvent} e - The keyboard event.
   */
  const handleKeyDown = (e) => {
    if (e.code === 'Space') {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable;

      if (!isInputFocused && currentWaveSurfer.current) {
        e.preventDefault();
        try {
          if (currentWaveSurfer.current.isPlaying()) {
            currentWaveSurfer.current.pause();
          } else {
            currentWaveSurfer.current.setVolume(1);
            currentWaveSurfer.current.play();
          }
        } catch (error) {
          console.warn('[Context] Error toggling play/pause via spacebar:', error);
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <PlaybackContext.Provider
      value={{
        currentTrack,
        setCurrentTrack: setCurrentTrackWithLog,
        currentWaveSurfer,
        setPlayingWaveSurfer,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};

PlaybackProvider.propTypes = {
  children: PropTypes.node.isRequired,
};