import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';   // Import the Navbar component
import Content from './Content'; // Import the Content component
import Player from './Player';   // Import the Player component
import './Main.scss';         // Styles for the .Main container

function Main() {
  const [allTracks, setAllTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null);
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:3000/tracks');
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorBody = await response.json();
            errorMessage += ` - ${errorBody.error || response.statusText}`;
          } catch (e) {
            errorMessage += ` - ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        const data = await response.json();
        const processedTracks = data.map(track => ({
          ...track,
          artwork_thumbnail_path: track.artwork_thumbnail_path || 'assets/default-artwork.png',
        }));
        setAllTracks(processedTracks);
        setFilteredTracks(processedTracks);
      } catch (e) {
        console.error("Failed to fetch tracks:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTracks();
  }, []);

  const handleTrackSelect = (trackId) => {
    setSelectedTrackId(trackId);
  };

  const handleSearch = (searchTerm) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (!lowerCaseSearchTerm.trim()) {
      setFilteredTracks(allTracks);
    } else {
      const results = allTracks.filter(track =>
        track.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        track.artist.toLowerCase().includes(lowerCaseSearchTerm) ||
        track.album.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setFilteredTracks(results);
    }
  };

  const handlePlayTrack = (track) => {
    if (!track || !track.id) {
      console.error("Invalid track object passed to handlePlayTrack:", track);
      return;
    }
    setAudioError('');
    const audioUrl = `http://localhost:3000/audio/${track.id}`;

    if (currentPlayingTrack && currentPlayingTrack.id === track.id && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
          setAudioError(`Cannot play: ${track.title}. ${e.message}`);
        });
      }
      // setIsPlaying will be handled by audio element events
    } else {
      setCurrentPlayingTrack(track);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.load();
        audioPlayerRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
          setAudioError(`Cannot play: ${track.title}. ${e.message}`);
          setIsPlaying(false); // Explicitly set to false on new track error
        });
      }
    }
  };

  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl) return;

    const handleAudioPlay = () => setIsPlaying(true);
    const handleAudioPause = () => setIsPlaying(false);
    const handleAudioEnded = () => {
      setIsPlaying(false);
      // Optional: play next track logic can be added here
    };
    const handleAudioError = (e) => {
      console.error("Audio Element Error:", e);
      // More specific error can be set if currentPlayingTrack is available
      setAudioError(`Audio error: ${currentPlayingTrack?.title || 'track'}.`);
      setIsPlaying(false);
    };

    audioEl.addEventListener('play', handleAudioPlay);
    audioEl.addEventListener('pause', handleAudioPause);
    audioEl.addEventListener('ended', handleAudioEnded);
    audioEl.addEventListener('error', handleAudioError);

    return () => {
      audioEl.removeEventListener('play', handleAudioPlay);
      audioEl.removeEventListener('pause', handleAudioPause);
      audioEl.removeEventListener('ended', handleAudioEnded);
      audioEl.removeEventListener('error', handleAudioError);
    };
  // Removed allTracks from dependency array as it might cause unnecessary re-renders
  // if track data is large and changes often in ways not relevant to playback.
  // currentPlayingTrack.id is sufficient for changes related to the current track.
  }, [audioPlayerRef, currentPlayingTrack?.id]); 

  return (
    <div className="Main">
      <Navbar />
      <div className="MainContent">
        <Content
          filteredTracks={filteredTracks}
          selectedTrackId={selectedTrackId}
          currentPlayingTrack={currentPlayingTrack}
          isPlaying={isPlaying}
          audioError={audioError}
          onTrackSelect={handleTrackSelect}
          onPlayTrack={handlePlayTrack}
          onSearch={handleSearch}
          isLoading={isLoading}
          error={error}
        />
      </div>
      <Player
        audioPlayerRef={audioPlayerRef}
        currentPlayingTrack={currentPlayingTrack}
        isPlaying={isPlaying}
        audioError={audioError}
      />
    </div>
  );
}

export default Main;