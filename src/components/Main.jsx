import React, { useState, useEffect, useRef, useContext } from 'react';
import Navbar from './Navbar';   // Import the Navbar component
import Content from './Content'; // Import the Content component
import Player from './Player';   // Import the Player component
import { PlaybackContext } from '../context/PlaybackContext';
import './Main.scss';         // Styles for the .Main container

function Main() {
  const [allTracks, setAllTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const { currentWaveSurfer, setCurrentTrack: setContextTrack } = useContext(PlaybackContext);
  const timeUpdateIntervalRef = useRef(null);

  // Autocomplete states removed
  // const [searchTerm, setSearchTerm] = useState('');
  // const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);

  // State for selected feature category for the new column
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState('Style'); // Default to 'Style'

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

  // This is the primary search execution function
  const executeSearch = (termToSearch) => {
    const lowerCaseSearchTerm = termToSearch.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      setFilteredTracks(allTracks);
    } else {
      const results = allTracks.filter(track =>
        (track.title && track.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (track.artist && track.artist.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (track.album && track.album.toLowerCase().includes(lowerCaseSearchTerm))
      );
      setFilteredTracks(results);
    }
  };

  // handleSearchInputChange and handleSuggestionClick removed

  const handleFeatureCategoryChange = (category) => {
    setSelectedFeatureCategory(category);
  };

  const handlePlayTrack = (track) => {
    if (!track || !track.id) {
      console.error("[Main] Invalid track object passed to handlePlayTrack:", track);
      return;
    }

    if (currentPlayingTrack && currentPlayingTrack.id === track.id) {
      setIsPlaying(prev => !prev);
    } else {
      setCurrentPlayingTrack(track);
      setContextTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const handleSeek = (newTime) => {
    if (currentWaveSurfer.current) {
      try {
        const duration = currentWaveSurfer.current.getDuration();
        if (duration > 0) {
          const seekPosition = Math.min(1, Math.max(0, newTime / duration));
          currentWaveSurfer.current.seekTo(seekPosition);
        }
      } catch(e) { /* console.warn("Error in handleSeek", e) */ }
    }
  };

  useEffect(() => {
    if (currentWaveSurfer.current) {
      try {
        if (isPlaying) {
          currentWaveSurfer.current.setVolume(1);
          currentWaveSurfer.current.play();
        } else {
          currentWaveSurfer.current.pause();
        }
      } catch(e) { console.warn("[Main] Error in play/pause effect", e) }
    }
  }, [isPlaying, currentWaveSurfer.current]);

  useEffect(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    if (currentWaveSurfer.current && isPlaying) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (currentWaveSurfer.current) {
          try {
            const newTime = currentWaveSurfer.current.getCurrentTime();
            const duration = currentWaveSurfer.current.getDuration();
            if (newTime >= 0 && duration > 0 && newTime <= duration) {
              setCurrentTime(newTime);
            }
          } catch (e) { /* console.warn('Error getting current time from WaveSurfer:', e); */ }
        }
      }, 100);
    }
    return () => clearInterval(timeUpdateIntervalRef.current);
  }, [currentWaveSurfer.current, isPlaying]);

  useEffect(() => {
    if (!currentWaveSurfer.current) return;

    const activeWs = currentWaveSurfer.current;

    const handleFinish = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleSeekEvent = () => {
      if (activeWs) {
        try {
          const newTime = activeWs.getCurrentTime();
          setCurrentTime(newTime);
        } catch (e) { /* console.warn('Error getting time on seek:', e); */ }
      }
    };
    
    activeWs.on('finish', handleFinish);
    activeWs.on('seek', handleSeekEvent); 

    return () => {
      activeWs.un('finish', handleFinish);
      activeWs.un('seek', handleSeekEvent);
    };
  }, [currentWaveSurfer.current]);

  return (
    <div className="Main">
      <Navbar />
      <div className="MainContent">
        <Content
          filteredTracks={filteredTracks}
          selectedTrackId={selectedTrackId}
          currentPlayingTrack={currentPlayingTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onTrackSelect={handleTrackSelect}
          onPlayTrack={handlePlayTrack}
          onSeek={handleSeek}
          onSearch={executeSearch}
          isLoading={isLoading}
          error={error}
          selectedFeatureCategory={selectedFeatureCategory}
          onFeatureCategoryChange={handleFeatureCategoryChange}
        />
      </div>
      <Player
        currentPlayingTrack={currentPlayingTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
      />
    </div>
  );
}

export default Main;