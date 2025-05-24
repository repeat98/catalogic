import React from 'react';
import './FeatureSelectDropdown.scss'; // We'll create this SCSS file next

const FeatureSelectDropdown = ({ selectedCategory, onCategoryChange, categories }) => {
  const handleChange = (event) => {
    onCategoryChange(event.target.value);
  };

  // Prevent click events on the dropdown container from bubbling up to the table header
  const handleContainerClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div className="FeatureSelectContainer" onClick={handleContainerClick}>
      <select className="FeatureSelect" value={selectedCategory} onChange={handleChange}>
        {/* Clicks directly on the select element itself might also need stopping if the div doesn't cover all click interactions, 
            but stopping on the container is usually sufficient. The select's native click behavior for opening is desired. */}
        {categories.map(category => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FeatureSelectDropdown; 