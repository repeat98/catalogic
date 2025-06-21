import React, { useContext } from 'react';
import { PlaybackContext } from '../context/PlaybackContext';
import WaveformPreview from './WaveformPreview';
import './Player.scss'; // Imports styles for the Player component

const Player = ({ currentPlayingTrack, isPlaying, currentTime, onPendingSeek }) => {
  const { currentWaveSurfer } = useContext(PlaybackContext);

  console.log('[Player] Component render:', {
    currentPlayingTrackId: currentPlayingTrack?.id,
    isPlaying,
    currentTime,
    hasWaveSurfer: !!currentWaveSurfer.current,
    timestamp: Date.now()
  });

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

  const handlePlayPause = () => {
    console.log('[Player] handlePlayPause called, isPlaying:', isPlaying);
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

  const handleSeek = (seekTime) => {
    console.log('[Player] handleSeek called:', seekTime);
    if (currentWaveSurfer.current && currentPlayingTrack) {
      try {
        const duration = currentWaveSurfer.current.getDuration();
        if (duration > 0) {
          const seekPosition = Math.max(0, Math.min(1, seekTime / duration));
          console.log('[Player] Seeking to position:', seekPosition);
          currentWaveSurfer.current.seekTo(seekPosition);
        }
      } catch (error) {
        console.warn('Error seeking:', error);
      }
    }
  };

  const handleWaveformClick = () => {
    // This will be called when the waveform is clicked but the track is not currently playing
    // Since this is the current track's player, we just need to play/pause
    console.log('[Player] handleWaveformClick called');
    handlePlayPause();
  };

  return (
    <div className="Player">
      {currentPlayingTrack ? (
        <div className="player-content">
          {/* Track Info */}
          <div className="track-info-section">
            <div className="track-artwork">
              <img
                src={currentPlayingTrack.artwork_thumbnail_path || 'assets/default-artwork.png'}
                alt="artwork"
                onError={(e) => { e.target.src = 'assets/default-artwork.png'; }}
              />
            </div>
            <div className="track-details">
              <div className="track-title">{currentPlayingTrack.title}</div>
              <div className="track-artist">{currentPlayingTrack.artist}</div>
            </div>
          </div>

          {/* Player Controls */}
          <div className="player-controls-section">
            <button className="control-btn skip-prev">
              <span className="material-symbols-outlined">skip_previous</span>
            </button>
            <button
              className="control-btn play-pause-btn"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button className="control-btn skip-next">
              <span className="material-symbols-outlined">skip_next</span>
            </button>
          </div>

          {/* Waveform Visualization */}
          <div className="waveform-section">
            <WaveformPreview
              key={`player-waveform-${currentPlayingTrack.id}`}
              trackId={currentPlayingTrack.id}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onSeek={handleSeek}
              onPlayClick={handleWaveformClick}
              height={30}
              waveColor="#7a7a7a"
              progressColor="#9a9a9a"
              isPlayerWaveform={true}
            />
          </div>

          {/* Volume Controls */}
          <div className="volume-controls-section">
            <div className="volume-icon">
              <span className="material-symbols-outlined">volume_up</span>
            </div>
            <div className="volume-slider">
              <input 
                type="range" 
                min="0" 
                max="100" 
                defaultValue="80"
                className="volume-input"
              />
            </div>
          </div>

          {/* Playlist Icon */}
          <div className="playlist-section">
            <button className="playlist-btn">
              <span className="material-symbols-outlined">format_list_bulleted</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="NoTrackMessage">No track selected</div>
      )}
    </div>
  );
};

export default Player;