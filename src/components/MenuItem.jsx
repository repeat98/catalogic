import React from 'react';
import './MenuItem.scss'; // This SCSS remains unchanged for item appearance

const MenuItem = ({
  id, // New: ID for the item, used for context menu actions
  label,
  isSelected = false,
  showOptions = false,
  onClick, // Main click action for the item
  onOpenContextMenu, // New: Function to open context menu ( (event, id, label) => void )
}) => {
  let itemClass = '';

  if (isSelected) {
    itemClass = showOptions ? 'Property1OptionSelected' : 'Property1Selected';
  } else {
    itemClass = showOptions ? 'Property1Options' : 'Property1Default';
  }

  const handleDotsClick = (e) => {
    e.stopPropagation(); // Prevent triggering main onClick of the item
    e.preventDefault();  // Prevent any default action if dots were, e.g., a link
    if (onOpenContextMenu && id) { // Pass id and label for context
      onOpenContextMenu(e, { id, label }, null); // Third arg 'categoryType' is handled by parent
    }
  };

  return (
    <div
      data-layer="menu-item-instance"
      className={`MenuItemInstanceWrapper`}
      onClick={onClick} // Main click for the item
      role="button"
      tabIndex={onClick ? 0 : -1}
      onKeyPress={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
    >
      <div className={`${itemClass}`}>
        <div data-layer="title" className="Title">
          <div data-layer="icons" className="Icons">
            <div data-layer="Vector" className="Vector" />
          </div>
          <div data-layer="library-title" className="LibraryTitle">{label}</div>
        </div>
        {showOptions && (
          <div
            data-layer="dots"
            className="Dots"
            onClick={handleDotsClick} // Attach click handler here for dots
            role="button"
            aria-label="Options"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDotsClick(e);}}
          >
            <div data-layer="Ellipse 38" className="Ellipse38" />
            <div data-layer="Ellipse 39" className="Ellipse39" />
            <div data-layer="Ellipse 40" className="Ellipse40" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItem;