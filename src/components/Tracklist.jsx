import React, { useState, useEffect, useRef, useCallback } from 'react';
import Track from './Track';
import WaveformPreview from './WaveformPreview';
import FeatureSelectDropdown from './FeatureSelectDropdown';
import './Tracklist.scss';

const featureCategories = [
  { value: 'Style', label: 'Style' },
  { value: 'Mood', label: 'Mood' },
  { value: 'Instrument', label: 'Instrument' },
  { value: 'Spectral', label: 'Spectral' },
];

// Define the initial columns configuration
// Widths here are initial/fallback widths. Actual widths will be managed in state.
const initialColumnsConfig = [
  { key: 'artwork_thumbnail_path', header: '', type: 'image', width: '50px', minWidth: 40, resizable: false, sortable: false },
  { key: 'waveform', header: 'Preview', width: '20%', type: 'waveform', minWidth: 100, resizable: true, sortable: false },
  { key: 'title', header: 'Title', width: '25%', minWidth: 100, resizable: true, sortable: true, sortType: 'string' },
  { key: 'artist', header: 'Artist', width: '20%', minWidth: 80, resizable: true, sortable: true, sortType: 'string' },
  { key: 'album', header: 'Album', width: '20%', minWidth: 80, resizable: true, sortable: true, sortType: 'string' },
  {
    key: 'features',
    headerComponent: (props) => (
      <FeatureSelectDropdown
        selectedCategory={props.selectedFeatureCategory}
        onCategoryChange={props.onFeatureCategoryChange}
        categories={featureCategories}
      />
    ),
    type: 'features',
    width: '25%',
    minWidth: 150,
    resizable: true,
    sortable: true,
    sortType: 'features'
  },
  { key: 'time', header: 'Time', width: '70px', minWidth: 60, textAlign: 'right', resizable: true, sortable: true, sortType: 'string' }, // Time might need custom sort if not just string
  { key: 'bpm', header: 'BPM', width: '70px', minWidth: 50, textAlign: 'right', resizable: true, sortable: true, sortType: 'number' },
  { key: 'key', header: 'Key', width: '70px', minWidth: 50, textAlign: 'right', resizable: true, sortable: true, sortType: 'string' },
  { key: 'year', header: 'Year', width: '70px', minWidth: 50, textAlign: 'right', resizable: true, sortable: true, sortType: 'string' }, // Year is often string, can be number if consistent
];

// Helper function to strip prefix like "Category---" (can be shared or duplicated if state management doesn't allow easy sharing)
const stripFeaturePrefixForDisplay = (tagName) => {
  if (typeof tagName !== 'string') return '';
  // return tagName.replace(/^.+?---/, ''); // Using regex for robustness
  const separatorIndex = tagName.indexOf('---');
  if (separatorIndex !== -1) {
    return tagName.substring(separatorIndex + 3);
  }
  return tagName; // Return original if no prefix found
};

const Tracklist = ({
  tracks = [],
  onTrackSelect,
  selectedTrackId,
  onPlayTrack,
  currentPlayingTrackId,
  isAudioPlaying,
  currentTime,
  onSeek,
  selectedFeatureCategory,
  onFeatureCategoryChange,
  // Sorting props
  sortConfig,
  requestSort,
  // Drag and drop props
  onTrackDragStart,
  // View mode props
  viewMode,
  onRemoveTrackFromTag,
  selectedTagId
}) => {
  const [columnConfig, setColumnConfig] = useState(
    initialColumnsConfig.map(col => ({ ...col, currentWidth: col.width }))
  );
  const tableRef = useRef(null);
  const currentlyResizingColRef = useRef(null);
  const animationFrameRef = useRef(null); // For requestAnimationFrame

  const handleMouseDown = (e, columnKey) => {
    e.preventDefault();
    const columnToResize = columnConfig.find(col => col.key === columnKey);
    if (!columnToResize || !columnToResize.resizable) return;

    const thElement = e.target.closest('th');
    currentlyResizingColRef.current = {
      key: columnKey,
      startingX: e.clientX,
      startingWidth: thElement.offsetWidth,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateColumnWidth = (key, newWidth) => {
    setColumnConfig(prevConfig =>
      prevConfig.map(col =>
        col.key === key ? { ...col, currentWidth: `${newWidth}px` } : col
      )
    );
  };

  const handleMouseMove = useCallback((e) => {
    if (!currentlyResizingColRef.current) return;
    e.preventDefault(); // Keep this here for immediate effect if needed

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (!currentlyResizingColRef.current) return; // Check again inside rAF
      const { key, startingX, startingWidth } = currentlyResizingColRef.current;
      const deltaX = e.clientX - startingX;
      let newCalculatedWidth = startingWidth + deltaX;

      const column = columnConfig.find(col => col.key === key); // Find column for minWidth check
      if (column && column.minWidth && newCalculatedWidth < column.minWidth) {
        newCalculatedWidth = column.minWidth;
      }
      updateColumnWidth(key, newCalculatedWidth);
    });
  }, [columnConfig]); // Keep columnConfig, as it's used to find the column for minWidth

  const handleMouseUp = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (!currentlyResizingColRef.current) return;
    currentlyResizingColRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    // Optional: Save final columnConfig to localStorage here
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup document event listeners when component unmounts
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]); // Ensure this effect re-runs if callbacks change

  const handleTrackClick = (track) => {
    if (onTrackSelect) {
      onTrackSelect(track.id);
    }
  };

  const handlePlayClickPassthrough = (e, track) => {
    e.stopPropagation();
    if (onPlayTrack) {
      onPlayTrack(track);
    }
  };

  const getTop5Tags = (featureObject) => {
    if (!featureObject || typeof featureObject !== 'object') return [];
    return Object.entries(featureObject)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 5)
      .map(([tag]) => stripFeaturePrefixForDisplay(tag)); // Strip prefix for display
  };

  const getTop5Spectral = (track) => {
    const spectralData = {
      atonal: track.atonal,
      tonal: track.tonal,
      dark: track.dark,
      bright: track.bright,
      percussive: track.percussive,
      smooth: track.smooth,
      // LUFS is text, handle separately if needed or exclude from sorting
    };
    const filteredSpectral = Object.entries(spectralData).filter(([,value]) => typeof value === 'number');

    return filteredSpectral
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 5)
      .map(([tag, value]) => `${tag}: ${value.toFixed(2)}`); // Display with value
  };

  const renderCell = (track, col) => {
    if (col.type === 'image') {
      return (
        <img
          src={track[col.key] || 'assets/default-artwork.png'}
          alt="artwork"
          className="TrackArtworkThumbnail"
          onError={(e) => {
            e.target.src = 'assets/default-artwork.png';
          }}
        />
      );
    }

    if (col.type === 'waveform') {
      return (
        <WaveformPreview
          trackId={track.id}
          isPlaying={currentPlayingTrackId === track.id && isAudioPlaying}
          currentTime={currentPlayingTrackId === track.id ? currentTime : 0}
          onSeek={onSeek}
          onPlayClick={() => onPlayTrack && onPlayTrack(track)}
        />
      );
    }

    if (col.type === 'features') {
      let tagsToDisplay = [];
      switch (selectedFeatureCategory) {
        case 'Style':
          tagsToDisplay = getTop5Tags(track.style_features);
          break;
        case 'Mood':
          tagsToDisplay = getTop5Tags(track.mood_features);
          break;
        case 'Instrument':
          tagsToDisplay = getTop5Tags(track.instrument_features);
          break;
        case 'Spectral':
          tagsToDisplay = getTop5Spectral(track);
          if (track.lufs) {
            const lufsTag = `LUFS: ${track.lufs}`;
            if (!tagsToDisplay.includes(lufsTag)) {
                tagsToDisplay.push(lufsTag);
            }
          }
          tagsToDisplay = [...new Set(tagsToDisplay)].slice(0,5);
          break;
        default:
          tagsToDisplay = [];
      }
      return (
        <div className="FeatureTagsContainer">
          {tagsToDisplay.map((tag, index) => <span key={`${tag}-${index}-${track.id}-${col.key}`} className="FeatureTag">{tag}</span>)}
        </div>
      );
    }

    return track[col.key] !== undefined && track[col.key] !== null ? track[col.key] : '-';
  };

  return (
    <div className="TracklistContainer">
      <table className="TracklistTable" ref={tableRef}>
        <colgroup>
          {columnConfig.map(col => <col key={col.key} style={{ width: col.currentWidth || col.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {columnConfig.map((col) => (
              <th
                key={col.key}
                style={{ width: col.currentWidth || col.width, textAlign: col.textAlign || 'left' }}
                onClick={col.sortable ? () => requestSort(col.key) : undefined}
                className={col.sortable ? 'SortableHeader' : ''}
              >
                <div className="ThContent">
                  {col.headerComponent ? (
                    <col.headerComponent selectedFeatureCategory={selectedFeatureCategory} onFeatureCategoryChange={onFeatureCategoryChange} />
                  ) : (
                    <span>{col.header}</span>
                  )}
                  {col.sortable && sortConfig && sortConfig.key === col.key && (
                    <span className={`SortIndicator ${sortConfig.direction === 'ascending' ? 'asc' : 'desc'}`}>
                      {sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                  {col.resizable && (
                    <div
                      className="ResizeHandle"
                      onMouseDown={(e) => handleMouseDown(e, col.key)}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${col.header || col.key} column`}
                    />
                  )}
                </div>
              </th>
            ))}
            {viewMode === 'tag' && onRemoveTrackFromTag && (
              <th className="TrackHeader" style={{ width: '50px' }}></th>
            )}
          </tr>
        </thead>
        <tbody>
          {tracks.length > 0 ? (
            tracks.map((track) => (
              <Track
                key={track.id}
                track={track}
                columns={columnConfig}
                isSelected={selectedTrackId === track.id}
                onTrackClick={() => handleTrackClick(track)}
                onPlayClick={onPlayTrack ? (e) => handlePlayClickPassthrough(e, track) : undefined}
                isCurrentTrack={currentPlayingTrackId === track.id}
                isPlaying={isAudioPlaying && currentPlayingTrackId === track.id}
                renderCell={renderCell}
                onDragStart={onTrackDragStart}
                viewMode={viewMode}
                onRemoveTrackFromTag={onRemoveTrackFromTag}
                selectedTagId={selectedTagId}
              />
            ))
          ) : (
            <tr>
              <td colSpan={columnConfig.length + (viewMode === 'tag' && onRemoveTrackFromTag ? 1 : 0)} className="NoTracksMessage">
                No tracks found. Add music to your library.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Tracklist;