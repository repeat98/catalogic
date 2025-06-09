import React from 'react';
import Tracklist from './Tracklist';
import SearchComponent from './SearchComponent';
import FilterPanel from './FilterPanel';
import RecommendationPanel from './RecommendationPanel';
import './Content.scss';

const Content = ({
  filteredTracks,
  selectedTrackId,
  currentPlayingTrack,
  isPlaying,
  currentTime,
  // audioError, // This prop was in the user's file but not used, remove if not needed
  onTrackSelect,
  onPlayTrack,
  onSeek,
  isLoading,
  error,
  // Updated Search props
  searchTerm,
  onSearchTermChange,
  // Feature Column Props
  selectedFeatureCategory,
  onFeatureCategoryChange,
  // Sorting props
  sortConfig,
  requestSort,
  // Filter props
  showFilterPanel,
  toggleFilterPanel,
  filterOptions,
  activeFilters,
  onToggleFilter,
  filterLogicMode,
  onToggleFilterLogicMode,
  // Drag and drop props
  onTrackDragStart,
  // View state props
  viewMode,
  selectedCrateId,
  selectedTagId,
  selectedLibraryItem,
  crates,
  tags,
  onRemoveTrackFromCrate,
  onRemoveTrackFromTag,
  allTracks,
  onAddTrackToTag
}) => {

  if (isLoading) {
    return <div className="ContentLoading">Loading tracks...</div>;
  }

  if (error) {
    return <div className="ContentError">Error loading tracks: {error}. Make sure the backend server is running.</div>;
  }

  // Get current view info
  const getCurrentViewInfo = () => {
    if (viewMode === 'crate' && selectedCrateId && crates[selectedCrateId]) {
      return {
        title: crates[selectedCrateId].name,
        subtitle: 'Crate',
        trackCount: filteredTracks.length
      };
    } else if (viewMode === 'tag' && selectedTagId && tags[selectedTagId]) {
      return {
        title: tags[selectedTagId].name,
        subtitle: 'Tag',
        trackCount: filteredTracks.length
      };
    } else {
      return {
        title: selectedLibraryItem || 'Tracks',
        subtitle: 'Library',
        trackCount: filteredTracks.length
      };
    }
  };

  const viewInfo = getCurrentViewInfo();

  // Get current tag's tracks for recommendations
  const getCurrentTagTracks = () => {
    if (viewMode === 'tag' && selectedTagId && tags[selectedTagId]) {
      return tags[selectedTagId].tracks || [];
    }
    return [];
  };

  const handleExport = () => {
    const trackIdsToExport = new Set(filteredTracks.map(t => t.id));
    const tracksToExport = allTracks.filter(t => trackIdsToExport.has(t.id));
    const playlistName = viewInfo.title;

    if (!tracksToExport || tracksToExport.length === 0) {
      alert('No tracks to export.');
      return;
    }

    let m3uContent = '#EXTM3U\n';
    tracksToExport.forEach(track => {
      const duration = Math.round(track.duration || -1);
      const artist = track.artist || 'Unknown Artist';
      const title = track.title || 'Unknown Title';
      const filePath = track.path || '';

      if (filePath.trim() === '') {
        console.warn(`Track ${artist} - ${title} (ID: ${track.id}) is missing a file path and will be skipped.`);
        return;
      }

      // #EXTINF:duration,track-title
      m3uContent += `#EXTINF:${duration},${artist} - ${title}\n`;
      // file path
      m3uContent += `${filePath}\n`;
    });

    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlistName}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-layer="content" className="Content">
      <div className="ViewHeader">
        <div className="ViewInfo">
          <h2 className="ViewTitle">{viewInfo.title}</h2>
          <span className="ViewSubtitle">{viewInfo.subtitle} • {viewInfo.trackCount} tracks</span>
        </div>
        {(viewMode === 'crate' || viewMode === 'tag') && (
          <div className="CrateActions">
            <button
              className="ActionButton"
              onClick={handleExport}
              title="Export as M3U playlist"
            >
              Export M3U
            </button>
            <button
              className="CrateActionButton"
              title={`Clear ${viewMode} filters to see all tracks in this ${viewMode}`}
              onClick={() => {
                // Clear all filters when viewing a crate or tag
                Object.keys(activeFilters).forEach(category => {
                  if (activeFilters[category] && activeFilters[category].length > 0) {
                    activeFilters[category].forEach(value => onToggleFilter(category, value));
                  }
                });
              }}
            >
              Show All {viewMode === 'crate' ? 'Crate' : 'Tag'} Tracks
            </button>
          </div>
        )}
      </div>
      <div className="SearchAndFilterControls">
        <SearchComponent 
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
        />
        <button onClick={toggleFilterPanel} className="FilterToggleButton">
          {showFilterPanel ? 'Hide Filters' : 'Show Filters'} 
        </button>
      </div>
      {showFilterPanel && (
        <div className={viewMode === 'library' ? 'collection-mode' : undefined}>
          <FilterPanel 
            filterOptions={filterOptions} 
            activeFilters={activeFilters} 
            onToggleFilter={onToggleFilter} 
            filterLogicMode={filterLogicMode}
            onToggleFilterLogicMode={onToggleFilterLogicMode}
          />
        </div>
      )}
      <div className="ContentMain">
        <div className="TracklistContainer">
          <Tracklist
            tracks={filteredTracks}
            selectedTrackId={selectedTrackId}
            onTrackSelect={onTrackSelect}
            onPlayTrack={onPlayTrack}
            currentPlayingTrackId={currentPlayingTrack?.id}
            isAudioPlaying={isPlaying}
            currentTime={currentTime}
            onSeek={onSeek}
            selectedFeatureCategory={selectedFeatureCategory}
            onFeatureCategoryChange={onFeatureCategoryChange}
            sortConfig={sortConfig}
            requestSort={requestSort}
            onTrackDragStart={onTrackDragStart}
            viewMode={viewMode}
            onRemoveTrackFromTag={viewMode === 'tag' ? onRemoveTrackFromTag : undefined}
            selectedTagId={selectedTagId}
          />
        </div>
        {viewMode === 'tag' && selectedTagId && (
          <div className={`RecommendationPanelContainer ${selectedTagId ? 'visible' : ''}`}>
            <RecommendationPanel
              currentTracks={getCurrentTagTracks()}
              allTracks={allTracks}
              onAcceptRecommendation={(trackId) => {
                if (selectedTagId) {
                  onAddTrackToTag(selectedTagId, trackId);
                }
              }}
              onRejectRecommendation={(trackId) => {
                // For now, just remove from recommendations
                // In the future, we could store rejected recommendations to avoid showing them again
              }}
              onPlayTrack={onPlayTrack}
              currentPlayingTrack={currentPlayingTrack}
              isPlaying={isPlaying}
              onSeek={onSeek}
              currentTime={currentTime}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Content;