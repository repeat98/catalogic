import React, { useState, useEffect } from 'react';
import './SearchComponent.scss';
import PropTypes from 'prop-types';

const SearchComponent = ({ 
  searchTerm, 
  onSearchTermChange,
  searchSuggestions = [],
  onSuggestionClick,
  showSuggestions = false,
  selectedSuggestionIndex = -1
}) => {
  const handleInputChange = (event) => {
    onSearchTermChange(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <form className="SearchForm" onSubmit={handleSubmit}>
      <div className="search-input-container">
        <input
          type="text"
          className="SearchInput"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Search tracks..."
          aria-label="Search tracks"
        />
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="search-suggestions">
            {searchSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
};

SearchComponent.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchTermChange: PropTypes.func.isRequired,
  searchSuggestions: PropTypes.arrayOf(PropTypes.string),
  onSuggestionClick: PropTypes.func,
  showSuggestions: PropTypes.bool,
  selectedSuggestionIndex: PropTypes.number
};

export default SearchComponent; 