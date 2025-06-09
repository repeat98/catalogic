import React from 'react';
import './MenuItem.scss'; // This SCSS remains unchanged for item appearance

const MenuItem = ({
  id, // New: ID for the item, used for context menu actions
  label,
  isSelected = false,
  showOptions = false,
  onClick, // Main click action for the item
  onOpenContextMenu, // New: Function to open context menu ( (event, id, label) => void )
  onDrop, // Drag and drop handler
  onDragOver, // Drag over handler
  isDragTarget = false, // Whether this item can accept drops
}) => {
  const [isDraggedOver, setIsDraggedOver] = React.useState(false);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggedOver(true);
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleDragLeave = (e) => {
    // Only hide the drag over state if we're actually leaving the element
    // (not just moving to a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggedOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggedOver(false);
    if (onDrop) {
      onDrop(e);
    }
  };

  const handleTrackDrop = (e) => {
    console.log('Track dropped on MenuItem:', { id, trackData: e.detail });
    setIsDraggedOver(false);
    
    // Create a synthetic event that matches the expected format
    const syntheticEvent = {
      preventDefault: () => {},
      dataTransfer: {
        getData: (type) => {
          if (type === 'text/plain') {
            return JSON.stringify({
              trackId: e.detail.trackId,
              trackData: e.detail.trackData
            });
          }
          return '';
        }
      }
    };
    
    if (onDrop) {
      onDrop(syntheticEvent);
    }
  };

  // Add event listener for custom track drop events
  React.useEffect(() => {
    const element = document.querySelector(`[data-menu-item-id="${id}"]`);
    if (element && isDragTarget) {
      element.addEventListener('trackDrop', handleTrackDrop);
      return () => {
        element.removeEventListener('trackDrop', handleTrackDrop);
      };
    }
  }, [id, isDragTarget, onDrop]);

  return (
    <div
      data-layer="menu-item-instance"
      data-menu-item-id={id}
      className={`MenuItemInstanceWrapper ${isDragTarget ? 'DragTarget' : ''} ${isDraggedOver ? 'drag-over' : ''}`}
      onClick={onClick} // Main click for the item
      role="button"
      tabIndex={onClick ? 0 : -1}
      onKeyPress={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      onDrop={isDragTarget ? handleDrop : undefined}
      onDragOver={isDragTarget ? handleDragOver : undefined}
      onDragLeave={isDragTarget ? handleDragLeave : undefined}
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