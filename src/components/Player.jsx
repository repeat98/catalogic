import React, { useContext } from 'react';
import { PlaybackContext } from '../context/PlaybackContext';
import './Player.scss'; // Imports styles for the Player component

const Player = ({ currentPlayingTrack, isPlaying, currentTime }) => {
  const { currentWaveSurfer } = useContext(PlaybackContext);

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDuration = () => {
    if (currentWaveSurfer.current) {
      try {
        const duration = currentWaveSurfer.current.getDuration();
        return duration > 0 ? duration : 0;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  };

  const getProgress = () => {
    const duration = getDuration();
    if (duration > 0 && currentTime >= 0) {
      return Math.min((currentTime / duration) * 100, 100);
    }
    return 0;
  };

  const handlePlayPause = () => {
    if (currentWaveSurfer.current) {
      try {
        if (isPlaying) {
          currentWaveSurfer.current.pause();
        } else {
          currentWaveSurfer.current.play();
        }
      } catch (error) {
        console.warn('Error controlling playback:', error);
      }
    }
  };

  const handleSeek = (e) => {
    if (!currentWaveSurfer.current || !currentPlayingTrack) return;
    
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      
      console.log('Player seeking to percentage:', percentage);
      currentWaveSurfer.current.seekTo(percentage);
    } catch (error) {
      console.warn('Error seeking:', error);
    }
  };

  return (
    <div className="Player">
      {currentPlayingTrack ? (
        <>
          <div className="PlayerInfo">
            <img
              src={currentPlayingTrack.artwork_thumbnail_path || 'assets/default-artwork.png'}
              alt="artwork"
              className="PlayerArtwork"
              onError={(e) => { e.target.src = 'assets/default-artwork.png'; }}
            />
            <div className="TrackInfo">
              <div className="TrackTitle">{currentPlayingTrack.title}</div>
              <div className="TrackArtist">{currentPlayingTrack.artist}</div>
            </div>
          </div>
          <div className="PlayerControls">
            <button 
              className="PlayPauseButton"
              onClick={handlePlayPause}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="TimeInfo">
              <span>{formatTime(currentTime)}</span>
              <div className="ProgressBar" onClick={handleSeek}>
                <div 
                  className="ProgressFill"
                  style={{ 
                    width: `${getProgress()}%`
                  }}
                />
              </div>
              <span>{formatTime(getDuration())}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="NoTrackMessage">No track selected</div>
      )}
    </div>
  );
};

export default Player;