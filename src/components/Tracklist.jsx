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
  { key: 'artwork_thumbnail_path', header: '', type: 'image', width: '50px', minWidth: 40, resizable: false },
  { key: 'waveform', header: 'Preview', width: '20%', type: 'waveform', minWidth: 100, resizable: true },
  { key: 'title', header: 'Title', width: '25%', minWidth: 100, resizable: true },
  { key: 'artist', header: 'Artist', width: '20%', minWidth: 80, resizable: true },
  { key: 'album', header: 'Album', width: '20%', minWidth: 80, resizable: true },
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
    resizable: true
  },
  { key: 'time', header: 'Time', width: '70px', minWidth: 60, textAlign: 'right', resizable: true },
  { key: 'bpm', header: 'BPM', width: '70px', minWidth: 50, textAlign: 'right', resizable: true },
  { key: 'key', header: 'Key', width: '70px', minWidth: 50, textAlign: 'right', resizable: true },
  { key: 'year', header: 'Year', width: '70px', minWidth: 50, textAlign: 'right', resizable: true },
];

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
  onFeatureCategoryChange
}) => {
  const [columnConfig, setColumnConfig] = useState(
    initialColumnsConfig.map(col => ({ ...col, currentWidth: col.width })) // resizable flag is directly from initialConfig
  );
  const tableRef = useRef(null);
  const currentlyResizingColRef = useRef(null); // { key, startingX, startingWidth }

  const handleMouseDown = (e, columnKey) => {
    e.preventDefault(); // Prevent text selection
    const columnToResize = columnConfig.find(col => col.key === columnKey);
    if (!columnToResize || !columnToResize.resizable) return;

    const thElement = e.target.closest('th');
    const startingWidth = thElement.offsetWidth;

    currentlyResizingColRef.current = {
      key: columnKey,
      startingX: e.clientX,
      startingWidth: startingWidth,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!currentlyResizingColRef.current) return;
    e.preventDefault();

    const { key, startingX, startingWidth } = currentlyResizingColRef.current;
    const deltaX = e.clientX - startingX;
    let newWidth = startingWidth + deltaX;

    const columnIndex = columnConfig.findIndex(col => col.key === key);
    const column = columnConfig[columnIndex];

    if (column.minWidth && newWidth < column.minWidth) {
      newWidth = column.minWidth;
    }

    // Update the width for the specific column
    setColumnConfig(prevConfig =>
      prevConfig.map(col =>
        col.key === key ? { ...col, currentWidth: `${newWidth}px` } : col
      )
    );
  }, [columnConfig]); // Dependency: columnConfig

  const handleMouseUp = useCallback(() => {
    if (!currentlyResizingColRef.current) return;
    currentlyResizingColRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    // Here you could save the columnConfig to localStorage if desired
  }, [handleMouseMove]); // Dependency: handleMouseMove

  useEffect(() => {
    // Cleanup listeners if component unmounts while resizing
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


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
      .map(([tag]) => tag);
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
      let tags = [];
      switch (selectedFeatureCategory) {
        case 'Style':
          tags = getTop5Tags(track.style_features);
          break;
        case 'Mood':
          tags = getTop5Tags(track.mood_features);
          break;
        case 'Instrument':
          tags = getTop5Tags(track.instrument_features);
          break;
        case 'Spectral':
          tags = getTop5Spectral(track);
          if (track.lufs) tags.push(`LUFS: ${track.lufs}`); // Add LUFS if it exists
          // Limit to 5 total for spectral if LUFS is added
          tags = tags.slice(0,5);
          break;
        default:
          tags = [];
      }
      return (
        <div className="FeatureTagsContainer">
          {tags.map(tag => <span key={tag} className="FeatureTag">{tag}</span>)}
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
              >
                <div className="ThContent">
                  {col.headerComponent ? (
                    <col.headerComponent selectedFeatureCategory={selectedFeatureCategory} onFeatureCategoryChange={onFeatureCategoryChange} />
                  ) : (
                    <span>{col.header}</span>
                  )}
                  {col.resizable && (
                    <div
                      className="ResizeHandle"
                      onMouseDown={(e) => handleMouseDown(e, col.key)}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${col.header || 'feature'} column`}
                    />
                  )}
                </div>
              </th>
            ))}
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
              />
            ))
          ) : (
            <tr>
              <td colSpan={columnConfig.length} className="NoTracksMessage">
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