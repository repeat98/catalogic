// src/context/PlaybackContext.jsx

import React, { createContext, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

export const PlaybackContext = createContext();

export const PlaybackProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const currentWaveSurfer = useRef(null);

  /**
   * Sets the currently playing WaveSurfer instance.
   * Stops any previously playing instance and resets its progress.
   * @param {WaveSurfer} wavesurfer - The WaveSurfer instance to set as currently playing.
   */
  const setPlayingWaveSurfer = (newWaveSurferInstance) => {
    // Stop and reset the previous instance if it's different from the new one
    if (currentWaveSurfer.current && currentWaveSurfer.current !== newWaveSurferInstance) {
      try {
        currentWaveSurfer.current.stop(); // This stops playback and resets progress
        currentWaveSurfer.current.setVolume(0);
      } catch (error) {
        console.warn('[Context] Error stopping previous WaveSurfer:', error);
      }
    }
    
    // Set the new instance as current
    currentWaveSurfer.current = newWaveSurferInstance;
    
    // Ensure the new instance has full volume (only for new instances)
    if (newWaveSurferInstance && currentWaveSurfer.current !== newWaveSurferInstance) {
      try {
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
        setCurrentTrack,
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