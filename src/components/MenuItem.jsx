import React from 'react';
import './MenuItem.scss';

const MenuItem = ({
  label,
  icon, // Optional: Pass JSX for a custom icon if needed
  isSelected = false,
  showOptions = false,
  onClick,
}) => {
  let itemClass = '';

  if (isSelected) {
    // If selected, it uses either OptionSelected or Selected style
    itemClass = showOptions ? 'Property1OptionSelected' : 'Property1Selected';
  } else {
    // If not selected, it uses either Options or Default style
    itemClass = showOptions ? 'Property1Options' : 'Property1Default';
  }

  // The `icon` prop can be used to pass a custom icon component or SVG
  // If not provided, it defaults to the generic Vector div
  const renderIcon = icon || <div data-layer="DefaultIconVector" className="Vector" />;

  return (
    <div
      data-layer="menu-item-instance"
      className={`MenuItemInstance ${itemClass}`} // MenuItemInstance for general layout, itemClass for specific state styling
      onClick={onClick}
      role="button" // For accessibility
      tabIndex={0} // For accessibility
      onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }} // For accessibility
    >
      <div data-layer="title" className="Title">
        <div data-layer="icons" className="Icons">
          {renderIcon}
        </div>
        <div data-layer="library-title" className={`LibraryTitle ${isSelected ? 'LibraryTitle-Selected' : ''}`}>
          {label}
        </div>
      </div>
      {showOptions && (
        <div data-layer="dots" className="Dots">
          {/* SCSS handles dot color changes based on main item class and its :hover state */}
          <div data-layer="Ellipse 38" className="Ellipse38" />
          <div data-layer="Ellipse 39" className="Ellipse39" />
          <div data-layer="Ellipse 40" className="Ellipse40" />
        </div>
      )}
    </div>
  );
};

export default MenuItem;