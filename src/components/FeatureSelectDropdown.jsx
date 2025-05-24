import React from 'react';
import './FeatureSelectDropdown.scss'; // We'll create this SCSS file next

const FeatureSelectDropdown = ({ selectedCategory, onCategoryChange, categories }) => {
  const handleChange = (event) => {
    onCategoryChange(event.target.value);
  };

  return (
    <div className="FeatureSelectContainer">
      <select className="FeatureSelect" value={selectedCategory} onChange={handleChange}>
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