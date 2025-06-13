import React, { useState, useCallback, useMemo, useRef } from 'react';
import './TrackVisualizer.scss';

// Custom hooks
import { useTrackData } from '../hooks/useTrackData.js';

// Components
import Controls from './Controls.jsx';
import Visualization from './Visualization.jsx';
import Tooltip from './Tooltip.jsx';
import FilterPanel from './FilterPanel.jsx';
import TempPlaylist from './TempPlaylist.jsx';

// Utils
import { 
  VISUALIZATION_MODES, 
  NOISE_CLUSTER_COLOR, 
  HIGHLIGHT_COLOR, 
  SPECTRAL_KEYWORDS,
  DEFAULT_CLUSTER_COLORS,
  PADDING 
} from '../utils/constants.js';
import { generateFeatureColors } from '../utils/colorUtils.js';

const TrackVisualizerRefactored = ({
  onPlayTrack,
  currentPlayingTrackId,
  isAudioPlaying,
  currentTime,
  onSeek
}) => {
  // Core state
  const [svgDimensions] = useState({ width: window.innerWidth, height: window.innerHeight - 150 });
  const { tracks, plotData, loading, error, featureMetadata, featureMinMax, refetch } = useTrackData(svgDimensions);
  
  // UI state
  const [tooltip, setTooltip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // Filter state
  const [selectedFeatures, setSelectedFeatures] = useState({
    genre: [],
    style: [],
    mood: [],
    instrument: [],
    spectral: []
  });
  const [filterLogicMode, setFilterLogicMode] = useState('intersection');
  const [highlightThreshold, setHighlightThreshold] = useState(0.1);
  
  // Visualization mode state
  const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.SIMILARITY);
  const [xAxisFeature, setXAxisFeature] = useState('');
  const [yAxisFeature, setYAxisFeature] = useState('');
  const [xyAxisAssignNext, setXyAxisAssignNext] = useState('x');
  
  // Lasso selection state
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [lassoMode, setLassoMode] = useState({
    isEnabled: false,
    isShiftPressed: false,
    toggleFn: null,
    clearFn: null
  });
  
  // Filter panel resizing
  const [filterPanelHeight, setFilterPanelHeight] = useState(300);
  const resizeHandlerRef = useRef({
    isResizing: false,
    startY: 0,
    startHeight: 0
  });

  // Tooltip timeout handling
  const hoverTimeoutRef = useRef(null);
  const isHoveringRef = useRef(false);
  const tooltipRef = useRef(null);

  // Generate track colors based on filters and search
  const trackColors = useMemo(() => {
    return plotData.map(track => {
      // Get the display title
      const displayTitle = track.title === 'Unknown Title' && track.path ? 
        track.path.split('/').pop().replace(/\.[^/.]+$/, '') : 
        (track.title || 'Unknown Title');
      
      const filename = track.path ? track.path.split('/').pop().replace(/\.[^/.]+$/, '') : '';

      // Search match highlighting
      const isSearchMatch = searchQuery && (
        displayTitle.toLowerCase() === searchQuery.toLowerCase() ||
        (track.title && track.title.toLowerCase() === searchQuery.toLowerCase()) ||
        filename.toLowerCase() === searchQuery.toLowerCase() ||
        (track.artist && track.artist.toLowerCase() === searchQuery.toLowerCase()) ||
        (track.album && track.album.toLowerCase() === searchQuery.toLowerCase()) ||
        (track.key && track.key.toLowerCase() === searchQuery.toLowerCase()) ||
        displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.title && track.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (track.album && track.album.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (track.key && track.key.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      if (isSearchMatch) {
        return { id: track.id, color: '#FFD700', isSearchMatch: true };
      }

      // Feature-based coloring
      const selectedFeaturesList = Object.values(selectedFeatures).flat();
      if (selectedFeaturesList.length === 0) {
        return { id: track.id, color: NOISE_CLUSTER_COLOR, isSearchMatch: false };
      }

      const featureColors = generateFeatureColors(selectedFeaturesList, DEFAULT_CLUSTER_COLORS);
      
      // Check matching features
      const matchingFeatures = selectedFeaturesList.filter(feature => {
        // Check different feature types
        try {
          const styleFeatures = typeof track.style_features === 'string' 
            ? JSON.parse(track.style_features) : track.style_features;
          if (styleFeatures) {
            if (selectedFeatures.genre.includes(feature)) {
              let maxGenreProb = 0;
              let mostProbableGenre = null;
              
              Object.entries(styleFeatures).forEach(([name, value]) => {
                const [genrePart] = name.split('---');
                const prob = parseFloat(value);
                if (genrePart && !isNaN(prob) && prob > maxGenreProb) {
                  maxGenreProb = prob;
                  mostProbableGenre = genrePart;
                }
              });
              
              return mostProbableGenre === feature;
            }
            
            if (selectedFeatures.style.includes(feature)) {
              return Object.entries(styleFeatures).some(([key, value]) => {
                const [, stylePart] = key.split('---');
                const prob = parseFloat(value);
                return stylePart === feature && !isNaN(prob) && prob >= highlightThreshold;
              });
            }
          }
        } catch (e) {}
        
        // Check other feature types
        ['mood_features', 'instrument_features'].forEach(featureType => {
          try {
            const features = typeof track[featureType] === 'string'
              ? JSON.parse(track[featureType]) : track[featureType];
            if (features && features[feature]) {
              const v = parseFloat(features[feature]);
              const minmax = featureMinMax[feature];
              if (minmax && minmax.max > minmax.min) {
                const norm = (v - minmax.min) / (minmax.max - minmax.min);
                if (norm >= highlightThreshold) return true;
              }
            }
          } catch (e) {}
        });
        
        // Check spectral features
        if (SPECTRAL_KEYWORDS.includes(feature) && track[feature] !== undefined) {
          const v = track[feature];
          const minmax = featureMinMax[feature];
          if (minmax && minmax.max > minmax.min) {
            const norm = (v - minmax.min) / (minmax.max - minmax.min);
            return norm >= highlightThreshold;
          }
        }
        
        return false;
      });

      if (matchingFeatures.length === 0) {
        return { id: track.id, color: NOISE_CLUSTER_COLOR, isSearchMatch: false };
      }

      if (filterLogicMode === 'intersection') {
        return { 
          id: track.id, 
          color: matchingFeatures.length === selectedFeaturesList.length ? HIGHLIGHT_COLOR : NOISE_CLUSTER_COLOR,
          isSearchMatch: false
        };
      } else {
        return { 
          id: track.id, 
          color: featureColors[matchingFeatures[0]] || HIGHLIGHT_COLOR,
          isSearchMatch: false
        };
      }
    });
  }, [plotData, searchQuery, selectedFeatures, filterLogicMode, highlightThreshold, featureMinMax]);

  // XY mode plot data
  const xyPlotData = useMemo(() => {
    if (visualizationMode !== VISUALIZATION_MODES.XY || !xAxisFeature || !yAxisFeature || !tracks.length) {
      return [];
    }
    
    const getFeatureValueAndConfidence = (track, feature) => {
      let value = null;
      let confidence = 0;
      
      try {
        const styleFeatures = typeof track.style_features === 'string' 
          ? JSON.parse(track.style_features) : track.style_features;
        if (styleFeatures && styleFeatures[feature] !== undefined) {
          value = parseFloat(styleFeatures[feature]);
          confidence = value;
        }
      } catch (e) {}
      
      try {
        const moodFeatures = typeof track.mood_features === 'string' 
          ? JSON.parse(track.mood_features) : track.mood_features;
        if (moodFeatures && moodFeatures[feature] !== undefined) {
          value = parseFloat(moodFeatures[feature]);
          confidence = value;
        }
      } catch (e) {}
      
      try {
        const instrumentFeatures = typeof track.instrument_features === 'string' 
          ? JSON.parse(track.instrument_features) : track.instrument_features;
        if (instrumentFeatures && instrumentFeatures[feature] !== undefined) {
          value = parseFloat(instrumentFeatures[feature]);
          confidence = value;
        }
      } catch (e) {}
      
      if (SPECTRAL_KEYWORDS.includes(feature) && track[feature] !== undefined) {
        value = track[feature];
        confidence = 1;
      }
      
      return { value, confidence };
    };

    const xMinMax = featureMinMax[xAxisFeature];
    const yMinMax = featureMinMax[yAxisFeature];
    let xLogMin = 0, xLogMax = 1, yLogMin = 0, yLogMax = 1;
    
    if (xMinMax && xMinMax.max > xMinMax.min && xMinMax.min >= 0) {
      xLogMin = Math.log1p(xMinMax.min);
      xLogMax = Math.log1p(xMinMax.max);
      if (xLogMax === xLogMin) xLogMax = xLogMin + 1e-6;
    }
    
    if (yMinMax && yMinMax.max > yMinMax.min && yMinMax.min >= 0) {
      yLogMin = Math.log1p(yMinMax.min);
      yLogMax = Math.log1p(yMinMax.max);
      if (yLogMax === yLogMin) yLogMax = yLogMin + 1e-6;
    }

    return tracks
      .map(track => {
        const xData = getFeatureValueAndConfidence(track, xAxisFeature);
        const yData = getFeatureValueAndConfidence(track, yAxisFeature);
        
        if (xData.confidence < highlightThreshold || yData.confidence < highlightThreshold) {
          return null;
        }

        let xLog = (xData.value != null && xData.value >= 0) ? Math.log1p(xData.value) : 0;
        let yLog = (yData.value != null && yData.value >= 0) ? Math.log1p(yData.value) : 0;

        let xNorm = 0.5;
        let yNorm = 0.5;
        if (xLogMax > xLogMin) {
          xNorm = (xLog - xLogMin) / (xLogMax - xLogMin);
        }
        if (yLogMax > yLogMin) {
          yNorm = (yLog - yLogMin) / (yLogMax - yLogMin);
        }

        return {
          ...track,
          x: PADDING + xNorm * (svgDimensions.width - 2 * PADDING),
          y: PADDING + (1 - yNorm) * (svgDimensions.height - 2 * PADDING),
          xValue: xData.value,
          yValue: yData.value
        };
      })
      .filter(Boolean);
  }, [visualizationMode, xAxisFeature, yAxisFeature, tracks, featureMinMax, svgDimensions, highlightThreshold]);

  // Choose which plot data to use
  const plotDataToUse = visualizationMode === VISUALIZATION_MODES.XY ? xyPlotData : plotData;



  // Event handlers
  const handleTrackHover = useCallback((trackData, event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      isHoveringRef.current = true;

      const tooltipWidth = 300;
      const tooltipHeight = 200;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = event.clientX - tooltipWidth / 2;
      let y = event.clientY - tooltipHeight - 2;

      if (x + tooltipWidth > viewportWidth) x = viewportWidth - tooltipWidth - 2;
      if (x < 2) x = 2;
      if (y < 2) y = event.clientY + 2;
      if (y + tooltipHeight > viewportHeight) y = viewportHeight - tooltipHeight - 2;

      setTooltip({
        track: trackData,
        position: { x, y }
      });
    }, 150);
  }, []);

  const handleTrackOut = useCallback((event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    const tooltipElement = tooltipRef.current;
    if (tooltipElement) {
      const rect = tooltipElement.getBoundingClientRect();
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      
      const buffer = 10;
      if (mouseX >= rect.left - buffer && 
          mouseX <= rect.right + buffer && 
          mouseY >= rect.top - buffer && 
          mouseY <= rect.bottom + buffer) {
        isHoveringRef.current = true;
        return;
      }
    }
    
    isHoveringRef.current = false;
    setTooltip(null);
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    setTooltip(null);
  }, []);

  const handleTrackClick = useCallback((trackData) => {
    console.log("Clicked track:", trackData.id, trackData.title);
  }, []);

  // Search functionality
  const generateSuggestions = useCallback((query) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const suggestions = new Set();

    plotDataToUse.forEach(track => {
      const displayTitle = track.title === 'Unknown Title' && track.path ? 
        track.path.split('/').pop().replace(/\.[^/.]+$/, '') : 
        (track.title || 'Unknown Title');
      const filename = track.path ? track.path.split('/').pop().replace(/\.[^/.]+$/, '') : '';

      if (displayTitle.toLowerCase().includes(queryLower)) suggestions.add(displayTitle);
      if (track.title && track.title.toLowerCase().includes(queryLower)) suggestions.add(track.title);
      if (filename.toLowerCase().includes(queryLower)) suggestions.add(filename);
      if (track.artist && track.artist.toLowerCase().includes(queryLower)) suggestions.add(track.artist);
      if (track.album && track.album.toLowerCase().includes(queryLower)) suggestions.add(track.album);
      if (track.tag1 && track.tag1.toLowerCase().includes(queryLower)) suggestions.add(track.tag1);
      if (track.key && track.key.toLowerCase().includes(queryLower)) suggestions.add(track.key);
    });

    const sortedSuggestions = Array.from(suggestions)
      .sort((a, b) => {
        const aStartsWith = a.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.toLowerCase().startsWith(queryLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 5);

    setSearchSuggestions(sortedSuggestions);
  }, [plotDataToUse]);

  const handleSearchChange = useCallback((e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    generateSuggestions(newQuery);
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
  }, [generateSuggestions]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex > -1) {
          handleSuggestionClick(searchSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  }, [showSuggestions, searchSuggestions, selectedSuggestionIndex, handleSuggestionClick]);

  // Filter functionality
  const handleFeatureToggle = useCallback((category, feature) => {
    if (visualizationMode === VISUALIZATION_MODES.XY) {
      // Handle axis assignment in XY mode
      if (xyAxisAssignNext === 'x') {
        setXAxisFeature(feature);
        setXyAxisAssignNext('y');
      } else {
        setYAxisFeature(feature);
        setXyAxisAssignNext('x');
      }
    } else {
      // Normal feature selection
      setSelectedFeatures(prev => {
        const newFeatures = { ...prev };
        const categoryFeatures = [...prev[category]];
        const index = categoryFeatures.indexOf(feature);
        
        if (index === -1) {
          categoryFeatures.push(feature);
        } else {
          categoryFeatures.splice(index, 1);
        }
        
        newFeatures[category] = categoryFeatures;
        return newFeatures;
      });
    }
  }, [visualizationMode, xyAxisAssignNext]);

  // Get filter options from tracks
  const filterOptions = useMemo(() => {
    const options = {
      genre: [],
      style: [],
      mood: [],
      instrument: [],
      spectral: []
    };

    tracks.forEach(track => {
      // Process style features for both genre and style
      try {
        const styleFeatures = typeof track.style_features === 'string' 
          ? JSON.parse(track.style_features) 
          : track.style_features;
        if (styleFeatures) {
          let maxGenreProb = 0;
          let mostProbableGenre = null;
          
          Object.entries(styleFeatures).forEach(([name, value]) => {
            const [genrePart, stylePart] = name.split('---');
            const prob = parseFloat(value);
            
            if (visualizationMode !== VISUALIZATION_MODES.XY && genrePart && !isNaN(prob) && prob > maxGenreProb) {
              maxGenreProb = prob;
              mostProbableGenre = genrePart;
            }
            
            if (stylePart) {
              const style = { name: stylePart, count: 1 };
              const existingStyle = options.style.find(s => s.name === style.name);
              if (existingStyle) existingStyle.count++;
              else options.style.push(style);
            }
          });
          
          if (visualizationMode !== VISUALIZATION_MODES.XY && mostProbableGenre) {
            const genre = { name: mostProbableGenre, count: 1 };
            const existingGenre = options.genre.find(g => g.name === genre.name);
            if (existingGenre) existingGenre.count++;
            else options.genre.push(genre);
          }
        }
      } catch (e) {}

      // Process other feature types
      ['mood_features', 'instrument_features'].forEach((featureType, index) => {
        const category = ['mood', 'instrument'][index];
        try {
          const features = typeof track[featureType] === 'string'
            ? JSON.parse(track[featureType])
            : track[featureType];
          if (features) {
            Object.entries(features).forEach(([name]) => {
              const feature = { name, count: 1 };
              const existing = options[category].find(f => f.name === name);
              if (existing) existing.count++;
              else options[category].push(feature);
            });
          }
        } catch (e) {}
      });

      // Process spectral features
      SPECTRAL_KEYWORDS.forEach(key => {
        if (track[key] !== undefined) {
          const feature = { name: key, count: 1 };
          const existing = options.spectral.find(f => f.name === key);
          if (existing) existing.count++;
          else options.spectral.push(feature);
        }
      });
    });

    // Sort all options by count (descending) and then by name
    Object.keys(options).forEach(category => {
      options[category].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
    });

    return options;
  }, [tracks, visualizationMode]);

  // Lasso functionality
  const handleLassoToggle = useCallback((isLassoMode, isShiftPressed, toggleFn, clearFn) => {
    setLassoMode({
      isEnabled: isLassoMode,
      isShiftPressed,
      toggleFn,
      clearFn
    });
  }, []);

  const handleLassoSelection = useCallback((tracks) => {
    setSelectedTracks(tracks);
  }, []);

  // Filter panel resize
  const handleResizeStart = useCallback((e) => {
    const handler = resizeHandlerRef.current;
    handler.isResizing = true;
    handler.startY = e.clientY;
    handler.startHeight = filterPanelHeight;
    document.body.style.cursor = 'ns-resize';
    
    const handleMove = (moveEvent) => {
      if (!handler.isResizing) return;
      const deltaY = handler.startY - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(handler.startHeight + deltaY, 600));
      setFilterPanelHeight(newHeight);
    };
    
    const handleEnd = () => {
      handler.isResizing = false;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
  }, [filterPanelHeight]);

  // Cleanup tooltip timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Loading and error states
  if (loading) return <div className="track-visualizer-loading">Loading tracks and features...</div>;
  if (error) return (
    <div className="track-visualizer-error">
      Error: {error} 
      <button onClick={refetch}>Try Reload</button>
    </div>
  );
  if (plotData.length === 0 && !loading && tracks.length > 0) {
    return <div className="track-visualizer-empty">Data processed, but no points to visualize. Check feature processing.</div>;
  }
  if (plotData.length === 0 && !loading && tracks.length === 0) {
    return <div className="track-visualizer-empty">No tracks data loaded.</div>;
  }

  return (
    <div className="TrackVisualizer">
      <div className="main-content">
        {selectedTracks.length > 0 && (
          <TempPlaylist
            selectedTracks={selectedTracks}
            onClearSelection={lassoMode.clearFn}
            onTrackClick={(track) => console.log('Track clicked in temp playlist:', track.title)}
            onTrackDoubleClick={(track) => console.log('Track double-clicked in temp playlist:', track.title)}
            onRemoveTrack={(track) => {
              setSelectedTracks(prev => prev.filter(t => t.id !== track.id));
            }}
            className="track-visualizer-temp-playlist"
            currentPlayingTrackId={currentPlayingTrackId}
            isAudioPlaying={isAudioPlaying}
            currentTime={currentTime}
            onSeek={onSeek}
            onPlayTrack={onPlayTrack}
          />
        )}
        
        <div className="VisualizationContainer">
          <Controls
            visualizationMode={visualizationMode}
            onVisualizationModeChange={setVisualizationMode}
            isLassoMode={lassoMode.isEnabled}
            onLassoToggle={lassoMode.toggleFn}
            isShiftPressed={lassoMode.isShiftPressed}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchSuggestions={searchSuggestions}
            onSuggestionClick={handleSuggestionClick}
            showSuggestions={showSuggestions}
            selectedSuggestionIndex={selectedSuggestionIndex}
            onKeyDown={handleKeyDown}
          />
          
          <Visualization
            plotData={plotDataToUse}
            trackColors={trackColors}
            onTrackHover={handleTrackHover}
            onTrackOut={handleTrackOut}
            onTrackClick={handleTrackClick}
            isLassoEnabled={true}
            onLassoToggle={handleLassoToggle}
            onLassoSelection={handleLassoSelection}
          />
          
          {tooltip && (
            <Tooltip
              ref={tooltipRef}
              track={tooltip.track}
              position={tooltip.position}
              onMouseLeave={handleTooltipMouseLeave}
              currentPlayingTrackId={currentPlayingTrackId}
              isAudioPlaying={isAudioPlaying}
              currentTime={currentTime}
              onSeek={onSeek}
              onPlayTrack={onPlayTrack}
            />
          )}
        </div>
      </div>
      
      <div className="FilterPanelWrapper" style={{ height: filterPanelHeight }}>
        <div className="resize-handle" onMouseDown={handleResizeStart} />
        <FilterPanel
          filterOptions={filterOptions}
          activeFilters={selectedFeatures}
          onToggleFilter={handleFeatureToggle}
          filterLogicMode={filterLogicMode}
          onToggleFilterLogicMode={() => setFilterLogicMode(prev => 
            prev === 'intersection' ? 'union' : 'intersection'
          )}
          axisAssignments={visualizationMode === VISUALIZATION_MODES.XY ? 
            { x: xAxisFeature, y: yAxisFeature } : undefined}
          highlightThreshold={highlightThreshold}
          onHighlightThresholdChange={setHighlightThreshold}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchSuggestions={searchSuggestions}
          onSuggestionClick={handleSuggestionClick}
          showSuggestions={showSuggestions}
          selectedSuggestionIndex={selectedSuggestionIndex}
          activeTab="Map"
        />
      </div>
    </div>
  );
};

export default TrackVisualizerRefactored; 