import React, { useState, useEffect, useRef, useContext } from 'react';
import Navbar from './Navbar';   // Import the Navbar component
import Content from './Content'; // Import the Content component
import Player from './Player';   // Import the Player component
import { PlaybackContext } from '../context/PlaybackContext';
import './Main.scss';         // Styles for the .Main container

// Helper function to strip prefix like "Category---"
const stripFeaturePrefix = (tagName) => {
  if (typeof tagName !== 'string') return '';
  return tagName.substring(tagName.indexOf('---') + 3);
  // A more robust regex could be: tagName.replace(/^.+?---/, '');
};

// Helper function to get a composite sort key from top N tags
const getCompositeFeatureSortKey = (track, categoryKey, numTopTags = 2) => {
  const featureObject = track[categoryKey];
  if (!featureObject || typeof featureObject !== 'object' || Object.keys(featureObject).length === 0) return ''; 
  
  const topTags = Object.entries(featureObject)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, numTopTags)
    .map(([tag]) => stripFeaturePrefix(tag).toLowerCase()) // Strip prefix here
    .join(','); 
  
  return topTags;
};

// Helper function to get the highest spectral value (moved outside component for sortTracks)
const getTopSpectralValue = (track) => {
  const spectralData = { atonal: track.atonal, tonal: track.tonal, dark: track.dark, bright: track.bright, percussive: track.percussive, smooth: track.smooth };
  const validEntries = Object.entries(spectralData).filter(([, value]) => typeof value === 'number');
  if (validEntries.length === 0) return null;
  validEntries.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
  return validEntries[0][1];
};

// Centralized sort function - updated to use getCompositeFeatureSortKey
const sortTracks = (tracks, sortConfig, selectedFeatureCategory, getCompositeFeatureSortKeyFn, getTopSpectralValueFn) => {
  if (!sortConfig || !sortConfig.key) return [...tracks];

  const sortedTracks = [...tracks].sort((a, b) => {
    let valA, valB;
    if (sortConfig.key === 'features') {
      switch (selectedFeatureCategory) {
        case 'Style': 
          valA = getCompositeFeatureSortKeyFn(a, 'style_features'); 
          valB = getCompositeFeatureSortKeyFn(b, 'style_features'); 
          break;
        case 'Mood': 
          valA = getCompositeFeatureSortKeyFn(a, 'mood_features'); 
          valB = getCompositeFeatureSortKeyFn(b, 'mood_features'); 
          break;
        case 'Instrument': 
          valA = getCompositeFeatureSortKeyFn(a, 'instrument_features'); 
          valB = getCompositeFeatureSortKeyFn(b, 'instrument_features'); 
          break;
        case 'Spectral': 
          valA = getTopSpectralValueFn(a); 
          valB = getTopSpectralValueFn(b); 
          break;
        default: valA = ''; valB = ''; // Use empty string for default case
      }
    } else {
      valA = a[sortConfig.key];
      valB = b[sortConfig.key];
    }

    // Handle cases where sort key might be effectively null (e.g., empty string from getCompositeFeatureSortKey)
    const aIsNull = valA === null || valA === undefined || valA === '';
    const bIsNull = valB === null || valB === undefined || valB === '';

    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return sortConfig.direction === 'ascending' ? 1 : -1;
    if (bIsNull) return sortConfig.direction === 'ascending' ? -1 : 1;
    
    let comparison = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      comparison = valA - valB;
    } else {
      comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
    }
    return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
  });
  return sortedTracks;
};

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
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState('Style');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchTerm, setSearchTerm] = useState('');

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
      } catch (e) {
        console.error("Failed to fetch tracks:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTracks();
  }, []);

  useEffect(() => {
    let tracksToDisplay = [...allTracks];
    if (searchTerm.trim() !== '') {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      tracksToDisplay = tracksToDisplay.filter(track =>
        (track.title && track.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (track.artist && track.artist.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (track.album && track.album.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }
    // Pass the new getCompositeFeatureSortKey to sortTracks
    tracksToDisplay = sortTracks(tracksToDisplay, sortConfig, selectedFeatureCategory, getCompositeFeatureSortKey, getTopSpectralValue);
    setFilteredTracks(tracksToDisplay);
  }, [allTracks, searchTerm, sortConfig, selectedFeatureCategory]);

  const handleTrackSelect = (trackId) => setSelectedTrackId(trackId);

  const handleSearchTermChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const handleFeatureCategoryChange = (category) => setSelectedFeatureCategory(category);

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
          searchTerm={searchTerm}
          onSearchTermChange={handleSearchTermChange}
          selectedFeatureCategory={selectedFeatureCategory}
          onFeatureCategoryChange={handleFeatureCategoryChange}
          sortConfig={sortConfig}
          requestSort={requestSort}
          isLoading={isLoading}
          error={error}
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