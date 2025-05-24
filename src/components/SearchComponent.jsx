import React from 'react';
import './SearchComponent.scss';

const SearchComponent = ({ searchTerm, onSearchTermChange }) => {
  const handleInputChange = (event) => {
    if (onSearchTermChange) {
      onSearchTermChange(event.target.value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <form className="SearchForm" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search tracks, artists, albums..."
        value={searchTerm}
        onChange={handleInputChange}
        className="SearchInput"
        autoComplete="off"
      />
      <button type="submit" className="SearchButton">Search</button>
    </form>
  );
};

export default SearchComponent; 