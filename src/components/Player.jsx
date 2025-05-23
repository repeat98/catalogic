import React from 'react';
import './Player.scss'; // Imports styles for the Player component

const Player = ({ currentPlayingTrack, isPlaying, audioError, audioPlayerRef }) => {
  return (
    // The main container for the player, styled by Player.scss
    <div data-layer="player" className="Player">
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />
      {(currentPlayingTrack || audioError) && (
        <div className="MiniPlayerInfo">
          {audioError ? (
            <span className="AudioErrorText">{audioError}</span>
          ) : currentPlayingTrack ? (
            <>
              Now {isPlaying ? 'Playing' : 'Paused'}: {currentPlayingTrack.title} - {currentPlayingTrack.artist}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Player;