import React, { useState } from 'react';
import './SearchComponent.scss';

const SearchComponent = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
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