import React, { useState, useRef, useEffect } from 'react';
import './MyTagsCell.scss';

const MyTagsCell = ({ 
  track, 
  availableTags = {}, 
  onAddTagToTrack, 
  onRemoveTagFromTrack 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Get tags that are currently assigned to this track
  const getAssignedTags = () => {
    const assignedTags = [];
    Object.entries(availableTags).forEach(([tagId, tag]) => {
      if (tag.tracks && tag.tracks.includes(track.id)) {
        assignedTags.push({ id: tagId, name: tag.name });
      }
    });
    return assignedTags;
  };

  // Get tags that are available to be assigned (not currently assigned)
  const getAvailableTags = () => {
    const assignedTagIds = getAssignedTags().map(tag => tag.id);
    return Object.entries(availableTags)
      .filter(([tagId]) => !assignedTagIds.includes(tagId))
      .map(([tagId, tag]) => ({ id: tagId, name: tag.name }));
  };

  const assignedTags = getAssignedTags();
  const availableToAssign = getAvailableTags();

  const handleAddTag = (tagId) => {
    if (onAddTagToTrack) {
      onAddTagToTrack(tagId, track.id);
    }
    setShowDropdown(false);
  };

  const handleRemoveTag = (tagId) => {
    if (onRemoveTagFromTrack) {
      onRemoveTagFromTrack(tagId, track.id);
    }
  };

  const handlePlusClick = (e) => {
    e.stopPropagation();
    
    if (!showDropdown && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownTop = buttonRect.bottom + 4;
      const dropdownLeft = buttonRect.right - 150; // Align right edge of dropdown with right edge of button
      
      setDropdownPosition({
        top: dropdownTop,
        left: Math.max(10, dropdownLeft) // Ensure dropdown doesn't go off-screen on the left
      });
    }
    
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    const handleScroll = () => {
      // Close dropdown on scroll to avoid positioning issues
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showDropdown]);

  return (
    <div className="my-tags-cell">
      <div className="assigned-tags">
        {assignedTags.map(tag => (
          <span key={tag.id} className="tag-badge">
            {tag.name}
            <button
              className="remove-tag-button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              title={`Remove ${tag.name} tag`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      <div className="add-tag-container">
        <button
          ref={buttonRef}
          className="add-tag-button"
          onClick={handlePlusClick}
          title="Add tag"
          disabled={availableToAssign.length === 0}
        >
          +
        </button>
        
        {showDropdown && availableToAssign.length > 0 && (
          <div 
            ref={dropdownRef} 
            className="tag-dropdown"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="tag-dropdown-header">Add Tag</div>
            <div className="tag-dropdown-options">
              {availableToAssign.map(tag => (
                <button
                  key={tag.id}
                  className="tag-dropdown-option"
                  onClick={() => handleAddTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTagsCell; 