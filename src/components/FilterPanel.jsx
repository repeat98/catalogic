import React, { useState, useMemo } from 'react';
import './FilterPanel.scss';

const FilterCategory = ({ title, options, activeItems, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter options based on search term and prioritize selected items at the top, then by count
  const filteredOptions = useMemo(() => {
    if (!options || options.length === 0) return [];
    
    let filteredBySearch = options;
    
    // Apply search filter if there's a search term
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      filteredBySearch = options.filter(option => 
        option.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Sort filtered options to show selected items first, then by count (descending), then alphabetically
    return filteredBySearch.sort((a, b) => {
      const aIsSelected = activeItems.includes(a.name);
      const bIsSelected = activeItems.includes(b.name);
      
      // If one is selected and the other isn't, prioritize the selected one
      if (aIsSelected && !bIsSelected) return -1;
      if (!aIsSelected && bIsSelected) return 1;
      
      // If both have the same selection state, sort by count (descending)
      if (b.count !== a.count) return b.count - a.count;
      
      // If counts are equal, maintain alphabetical order
      return a.name.localeCompare(b.name);
    });
  }, [options, searchTerm, activeItems]);

  if (!options || options.length === 0) return null;

  return (
    <div className="FilterCategory">
      <h4 className="FilterCategoryTitle">{title}</h4>
      <div className="FilterSearchContainer">
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="FilterSearchInput"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="FilterSearchClear"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <ul className="FilterCheckboxList">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(option => (
            <li key={option.name} className="FilterCheckboxItem">
              <label>
                <input 
                  type="checkbox" 
                  checked={activeItems.includes(option.name)}
                  onChange={() => onToggle(option.name)}
                />
                <span className="FilterOptionName">{option.name}</span>
                <span className="FilterOptionCount">({option.count})</span>
              </label>
            </li>
          ))
        ) : (
          <li className="FilterNoResults">No results found for "{searchTerm}"</li>
        )}
      </ul>
    </div>
  );
};

const FilterPanel = ({ 
  filterOptions, 
  activeFilters, 
  onToggleFilter, 
  filterLogicMode, 
  onToggleFilterLogicMode,
  highlightThreshold,
  onHighlightThresholdChange,
  searchQuery,
  onSearchChange,
  searchSuggestions,
  onSuggestionClick,
  showSuggestions,
  selectedSuggestionIndex,
  activeTab
}) => {
  const categories = [
    { id: 'genre', title: 'Genre', options: filterOptions.genre, active: activeFilters.genre },
    { id: 'style', title: 'Style', options: filterOptions.style, active: activeFilters.style },
    { id: 'mood', title: 'Mood', options: filterOptions.mood, active: activeFilters.mood },
    { id: 'instrument', title: 'Instrument', options: filterOptions.instrument, active: activeFilters.instrument },
    { id: 'spectral', title: 'Spectral Features', options: filterOptions.spectral, active: activeFilters.spectral },
  ];

  return (
    <div className="FilterPanelOuterContainer">
      <div className="FilterPanelHeader">
      </div>
      <div className="FilterPanelContainer">
        {categories.map(cat => (
          <FilterCategory 
            key={cat.id}
            title={cat.title}
            options={cat.options}
            activeItems={cat.active || []}
            onToggle={(value) => onToggleFilter(cat.id, value)}
          />
        ))}
      </div>
    </div>
  );
};

export default FilterPanel; 