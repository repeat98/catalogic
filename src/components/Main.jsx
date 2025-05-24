import React, { useState, useEffect, useRef, useContext } from 'react';
import Navbar from './Navbar';   // Import the Navbar component
import Content from './Content'; // Import the Content component
import Player from './Player';   // Import the Player component
import { PlaybackContext } from '../context/PlaybackContext';
import './Main.scss';         // Styles for the .Main container

// Corrected helper function to strip prefix like "Category---"
const stripFeaturePrefix = (tagName) => {
  if (typeof tagName !== 'string') return '';
  const separatorIndex = tagName.indexOf('---');
  if (separatorIndex !== -1) {
    return tagName.substring(separatorIndex + 3);
  }
  return tagName; // Return original if no prefix
};

// Helper function to get a composite sort key from top N tags (used for sorting)
const getCompositeFeatureSortKey = (track, categoryKey, numTopTags = 2) => {
  const featureObject = track[categoryKey];
  if (!featureObject || typeof featureObject !== 'object' || Object.keys(featureObject).length === 0) return ''; 
  const topTags = Object.entries(featureObject)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, numTopTags)
    .map(([tag]) => stripFeaturePrefix(tag).toLowerCase()) // Uses the corrected stripFeaturePrefix
    .join(','); 
  return topTags;
};

// Helper function to get the highest feature score for a category (used for sorting by score)
const getTopFeatureScore = (track, categoryKey) => {
  const featureObject = track[categoryKey];
  if (!featureObject || typeof featureObject !== 'object' || Object.keys(featureObject).length === 0) return 0;
  const scores = Object.values(featureObject).filter(score => typeof score === 'number');
  return scores.length > 0 ? Math.max(...scores) : 0;
};

// Helper function to get the score for a specific style from a track
const getSpecificStyleScore = (track, styleName) => {
  if (!track.style_features || typeof track.style_features !== 'object') return 0;
  
  // Look for the style in the format "Genre---StyleName"
  for (const [fullTag, score] of Object.entries(track.style_features)) {
    const parts = fullTag.split('---');
    const trackStyleName = parts.length > 1 ? parts[1] : fullTag;
    if (trackStyleName === styleName && typeof score === 'number') {
      return score;
    }
  }
  return 0;
};

// Helper function to get the score for a specific genre from a track
const getSpecificGenreScore = (track, genreName) => {
  if (!track.style_features || typeof track.style_features !== 'object') return 0;
  
  // Look for the genre in the format "GenreName---Style"
  for (const [fullTag, score] of Object.entries(track.style_features)) {
    const parts = fullTag.split('---');
    const trackGenreName = parts.length > 1 ? parts[0] : 'Unknown Genre';
    if (trackGenreName === genreName && typeof score === 'number') {
      return score;
    }
  }
  return 0;
};

// Helper function to get the score for a specific mood from a track
const getSpecificMoodScore = (track, moodName) => {
  if (!track.mood_features || typeof track.mood_features !== 'object') return 0;
  
  // Look for the mood (with or without prefix)
  for (const [fullTag, score] of Object.entries(track.mood_features)) {
    const trackMoodName = stripFeaturePrefix(fullTag);
    if (trackMoodName === moodName && typeof score === 'number') {
      return score;
    }
  }
  return 0;
};

// Helper function to get the score for a specific instrument from a track
const getSpecificInstrumentScore = (track, instrumentName) => {
  if (!track.instrument_features || typeof track.instrument_features !== 'object') return 0;
  
  // Look for the instrument (with or without prefix)
  for (const [fullTag, score] of Object.entries(track.instrument_features)) {
    const trackInstrumentName = stripFeaturePrefix(fullTag);
    if (trackInstrumentName === instrumentName && typeof score === 'number') {
      return score;
    }
  }
  return 0;
};

// Helper function to get the score for a specific spectral feature from a track
const getSpecificSpectralScore = (track, spectralFeatureName) => {
  if (!track || typeof track !== 'object') return 0;
  
  const value = track[spectralFeatureName];
  if (typeof value === 'number') {
    return value;
  }
  
  return 0;
};

// Helper specifically for getting top N style names for FILTERING (from previous step, assumed correct)
const getTrackTopNRawStyles = (track, numTop = 5) => {
  if (!track.style_features || typeof track.style_features !== 'object') return [];
  return Object.entries(track.style_features)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, numTop)
    .map(([fullTag]) => {
      const parts = fullTag.split('---');
      return parts.length > 1 ? parts[1] : fullTag; // Raw style name
    });
};

// Helper function to get the highest spectral value (used for sorting)
const getTopSpectralValue = (track) => {
  const spectralData = { atonal: track.atonal, tonal: track.tonal, dark: track.dark, bright: track.bright, percussive: track.percussive, smooth: track.smooth };
  const validEntries = Object.entries(spectralData).filter(([, value]) => typeof value === 'number');
  if (validEntries.length === 0) return null;
  validEntries.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
  return validEntries[0][1];
};

// Refined sortTracks function
const sortTracks = (tracks, sortConfig, selectedFeatureCategory, activeFilters, getTopFeatureScoreFn, getTopSpectralValueFn, getTrackTopNRawStylesFn, getSpecificStyleScoreFn, getSpecificGenreScoreFn, getSpecificMoodScoreFn, getSpecificInstrumentScoreFn, getSpecificSpectralScoreFn) => {
  const sortedTracks = [...tracks].sort((a, b) => {
    let comparison = 0;

    // Check if we have any active filters for best match sorting
    const hasActiveFilters = (activeFilters.style && activeFilters.style.length > 0) ||
                           (activeFilters.mood && activeFilters.mood.length > 0) ||
                           (activeFilters.instrument && activeFilters.instrument.length > 0) ||
                           (activeFilters.spectral && activeFilters.spectral.length > 0) ||
                           (activeFilters.genre && activeFilters.genre.length > 0);

    // PRIORITY 1: Best match sorting when filters are active (regardless of selected feature category)
    if (hasActiveFilters) {
      let scoreA = 0, scoreB = 0, foundActiveFilter = false;

      // Check for active filters in priority order (regardless of selectedFeatureCategory)
      // Priority: Style > Mood > Instrument > Spectral > Genre
      if (activeFilters.style && activeFilters.style.length > 0) {
        const prioritizedStyle = activeFilters.style[0];
        scoreA = getSpecificStyleScoreFn(a, prioritizedStyle);
        scoreB = getSpecificStyleScoreFn(b, prioritizedStyle);
        foundActiveFilter = true;
      }
      else if (activeFilters.mood && activeFilters.mood.length > 0) {
        const prioritizedMood = activeFilters.mood[0];
        scoreA = getSpecificMoodScoreFn(a, prioritizedMood);
        scoreB = getSpecificMoodScoreFn(b, prioritizedMood);
        foundActiveFilter = true;
      }
      else if (activeFilters.instrument && activeFilters.instrument.length > 0) {
        const prioritizedInstrument = activeFilters.instrument[0];
        scoreA = getSpecificInstrumentScoreFn(a, prioritizedInstrument);
        scoreB = getSpecificInstrumentScoreFn(b, prioritizedInstrument);
        foundActiveFilter = true;
      }
      else if (activeFilters.spectral && activeFilters.spectral.length > 0) {
        const prioritizedSpectral = activeFilters.spectral[0];
        scoreA = getSpecificSpectralScoreFn(a, prioritizedSpectral);
        scoreB = getSpecificSpectralScoreFn(b, prioritizedSpectral);
        foundActiveFilter = true;
      }
      else if (activeFilters.genre && activeFilters.genre.length > 0) {
        const prioritizedGenre = activeFilters.genre[0];
        scoreA = getSpecificGenreScoreFn(a, prioritizedGenre);
        scoreB = getSpecificGenreScoreFn(b, prioritizedGenre);
        foundActiveFilter = true;
      }

      if (foundActiveFilter) {
        // Sort by the actual score for this filter (higher scores first)
        comparison = scoreB - scoreA;
        // If scores are equal, we'll fall through to secondary sorting
      }
    }

    // PRIORITY 2: User-requested column sorting (only if no best match found or scores are equal)
    if (comparison === 0 && sortConfig && sortConfig.key) {
      // Standard sorting for all other columns or other feature categories, or for Style category if no style filter is active.
      let valA, valB;
      if (sortConfig.key === 'features') { 
        switch (selectedFeatureCategory) {
          case 'Style': // Style sorting, but no active filter to prioritize by.
            valA = getTopFeatureScoreFn(a, 'style_features');
            valB = getTopFeatureScoreFn(b, 'style_features');
            break;
          case 'Mood': 
            valA = getTopFeatureScoreFn(a, 'mood_features'); 
            valB = getTopFeatureScoreFn(b, 'mood_features'); 
            break;
          case 'Instrument': 
            valA = getTopFeatureScoreFn(a, 'instrument_features'); 
            valB = getTopFeatureScoreFn(b, 'instrument_features'); 
            break;
          case 'Spectral': 
            valA = getTopSpectralValueFn(a); 
            valB = getTopSpectralValueFn(b); 
            break;
          default: valA = ''; valB = '';
        }
      } else { // For non-'features' columns (e.g., title, artist, bpm)
        valA = a[sortConfig.key];
        valB = b[sortConfig.key];
      }

      // General comparison logic (handles nulls, numbers, strings)
      const aIsNull = valA === null || valA === undefined || valA === '';
      const bIsNull = valB === null || valB === undefined || valB === '';

      if (aIsNull && bIsNull) {
        comparison = 0;
      } else if (aIsNull) {
        comparison = 1; // nulls/empty strings go to the end in ascending sort
      } else if (bIsNull) {
        comparison = -1;
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
      }

      // Apply sort direction for user-requested sorting
      comparison = sortConfig.direction === 'ascending' ? comparison : comparison * -1;
    }

    // PRIORITY 3: Default fallback - if still no comparison and we have active filters, maintain best match order
    // (comparison will be 0 if tracks have equal scores, which is fine - they'll maintain their relative order)

    return comparison;
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

  // New state for filters
  const [filterOptions, setFilterOptions] = useState({ genre: [], style: [], mood: [], instrument: [], spectral: [] });
  const [activeFilters, setActiveFilters] = useState({ genre: [], style: [], mood: [], instrument: [], spectral: [] });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterLogicMode, setFilterLogicMode] = useState('intersection'); // 'intersection' (AND) or 'union' (OR)

  useEffect(() => {
    const fetchTracksAndProcess = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch('http://localhost:3000/tracks');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();
        const processedTracks = data.map(track => ({ ...track, artwork_thumbnail_path: track.artwork_thumbnail_path || 'assets/default-artwork.png' }));
        setAllTracks(processedTracks);

        // Aggregate filter options once all tracks are fetched
        const genres = {};
        const styles = {};
        const moods = {};
        const instruments = {};
        const spectralFeatureNames = ['atonal', 'tonal', 'dark', 'bright', 'percussive', 'smooth']; // LUFS is text

        processedTracks.forEach(track => {
          // Process style_features for Genre and Style
          if (track.style_features && typeof track.style_features === 'object') {
            Object.keys(track.style_features).forEach(fullTag => {
              const parts = fullTag.split('---');
              const genreName = parts.length > 1 ? parts[0] : 'Unknown Genre'; // Genre is before ---
              const styleName = parts.length > 1 ? parts[1] : fullTag;     // Style is after ---
              
              genres[genreName] = (genres[genreName] || 0) + 1;
              styles[styleName] = (styles[styleName] || 0) + 1;
            });
          }
          // Process mood_features
          if (track.mood_features && typeof track.mood_features === 'object') {
            Object.keys(track.mood_features).forEach(tag => moods[stripFeaturePrefix(tag)] = (moods[stripFeaturePrefix(tag)] || 0) + 1);
          }
          // Process instrument_features
          if (track.instrument_features && typeof track.instrument_features === 'object') {
            Object.keys(track.instrument_features).forEach(tag => instruments[stripFeaturePrefix(tag)] = (instruments[stripFeaturePrefix(tag)] || 0) + 1);
          }
        });
        
        const formatForFilterOptions = (obj) => Object.entries(obj)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        setFilterOptions({
          genre: formatForFilterOptions(genres),
          style: formatForFilterOptions(styles),
          mood: formatForFilterOptions(moods),
          instrument: formatForFilterOptions(instruments),
          spectral: spectralFeatureNames.map(name => ({ name, count: processedTracks.filter(t => t[name] !== null && t[name] !== undefined && t[name] !== 0).length }))
            .sort((a,b) => b.count - a.count)
        });

      } catch (e) {
        console.error("Failed to fetch tracks or process filters:", e); setError(e.message);
      } finally { setIsLoading(false); }
    };
    fetchTracksAndProcess();
  }, []);

  useEffect(() => {
    let tracksToDisplay = [...allTracks];
    
    // 1. Apply Search Filter
    if (searchTerm.trim() !== '') {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      tracksToDisplay = tracksToDisplay.filter(track =>
        (track.title && track.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (track.artist && track.artist.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (track.album && track.album.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // 2. Apply Active Filters (using logic from previous steps, assumed correct for now)
    const activeFilterCategories = Object.keys(activeFilters).filter(cat => activeFilters[cat] && activeFilters[cat].length > 0);
    if (activeFilterCategories.length > 0) {
      if (filterLogicMode === 'intersection') {
        activeFilterCategories.forEach(category => {
          const selectedValues = activeFilters[category];
          tracksToDisplay = tracksToDisplay.filter(track => {
            if (category === 'style') {
              const topStylesOfTrack = getTrackTopNRawStyles(track, 5);
              return selectedValues.some(selStyle => topStylesOfTrack.includes(selStyle));
            } else if (category === 'genre') {
              if (!track.style_features || typeof track.style_features !== 'object') return false;
              return selectedValues.some(selGenre => Object.keys(track.style_features).some(fullTag => (fullTag.split('---')[0] || 'Unknown Genre') === selGenre));
            } else if (category === 'mood') {
              if (!track.mood_features || typeof track.mood_features !== 'object') return false;
              return selectedValues.some(selMood => Object.keys(track.mood_features).map(stripFeaturePrefix).includes(selMood));
            } else if (category === 'instrument') {
              if (!track.instrument_features || typeof track.instrument_features !== 'object') return false;
              return selectedValues.some(selInstrument => Object.keys(track.instrument_features).map(stripFeaturePrefix).includes(selInstrument));
            } else if (category === 'spectral') {
              return selectedValues.some(specFeat => track[specFeat] !== null && track[specFeat] !== undefined && track[specFeat] !== 0);
            }
            return true; 
          });
        });
      } else { // filterLogicMode === 'union'
        tracksToDisplay = tracksToDisplay.filter(track => {
          return activeFilterCategories.some(category => {
            const selectedValues = activeFilters[category];
            if (category === 'style') {
              const topStylesOfTrack = getTrackTopNRawStyles(track, 5);
              return selectedValues.some(selStyle => topStylesOfTrack.includes(selStyle));
            } else if (category === 'genre') {
              if (!track.style_features || typeof track.style_features !== 'object') return false;
              return selectedValues.some(selGenre => Object.keys(track.style_features).some(fullTag => (fullTag.split('---')[0] || 'Unknown Genre') === selGenre));
            } else if (category === 'mood') {
              if (!track.mood_features || typeof track.mood_features !== 'object') return false;
              return selectedValues.some(selMood => Object.keys(track.mood_features).map(stripFeaturePrefix).includes(selMood));
            } else if (category === 'instrument') {
              if (!track.instrument_features || typeof track.instrument_features !== 'object') return false;
              return selectedValues.some(selInstrument => Object.keys(track.instrument_features).map(stripFeaturePrefix).includes(selInstrument));
            } else if (category === 'spectral') {
              return selectedValues.some(specFeat => track[specFeat] !== null && track[specFeat] !== undefined && track[specFeat] !== 0);
            }
            return false;
          });
        });
      }
    }

    // 3. Then Sort - pass all required helper functions
    tracksToDisplay = sortTracks(
      tracksToDisplay, 
      sortConfig, 
      selectedFeatureCategory, 
      activeFilters, 
      getTopFeatureScore, 
      getTopSpectralValue, 
      getTrackTopNRawStyles,
      getSpecificStyleScore,
      getSpecificGenreScore,
      getSpecificMoodScore,
      getSpecificInstrumentScore,
      getSpecificSpectralScore
    );
    setFilteredTracks(tracksToDisplay);
  }, [allTracks, searchTerm, sortConfig, selectedFeatureCategory, activeFilters, filterLogicMode]);

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

  const handleToggleFilter = (category, value) => {
    setActiveFilters(prev => {
      const currentCategoryFilters = prev[category] || [];
      const newCategoryFilters = currentCategoryFilters.includes(value) 
        ? currentCategoryFilters.filter(item => item !== value)
        : [...currentCategoryFilters, value];
      return { ...prev, [category]: newCategoryFilters };
    });
  };

  const toggleFilterPanel = () => setShowFilterPanel(prev => !prev);

  const toggleFilterLogicMode = () => {
    setFilterLogicMode(prevMode => prevMode === 'intersection' ? 'union' : 'intersection');
  };

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
          showFilterPanel={showFilterPanel}
          toggleFilterPanel={toggleFilterPanel}
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onToggleFilter={handleToggleFilter}
          filterLogicMode={filterLogicMode}
          onToggleFilterLogicMode={toggleFilterLogicMode}
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