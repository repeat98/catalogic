import React from 'react';
import Tracklist from './Tracklist';
import SearchComponent from './SearchComponent';
import FilterPanel from './FilterPanel';
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
  onToggleFilterLogicMode
}) => {

  if (isLoading) {
    return <div className="ContentLoading">Loading tracks...</div>;
  }

  if (error) {
    return <div className="ContentError">Error loading tracks: {error}. Make sure the backend server is running.</div>;
  }

  return (
    <div data-layer="content" className="Content">
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
        <FilterPanel 
          filterOptions={filterOptions} 
          activeFilters={activeFilters} 
          onToggleFilter={onToggleFilter} 
          filterLogicMode={filterLogicMode}
          onToggleFilterLogicMode={onToggleFilterLogicMode}
        />
      )}
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
        // Pass sorting props to Tracklist
        sortConfig={sortConfig}
        requestSort={requestSort}
      />
    </div>
  );
};

export default Content;