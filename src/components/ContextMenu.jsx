import React from 'react';
import './ContextMenu.scss';

const ContextMenu = ({ x, y, options, onClose }) => {
  if (!options || options.length === 0) {
    return null;
  }

  const handleOptionClick = (action) => {
    action();
    if (onClose) onClose(); // Close menu after action
  };

  return (
    <div
      className="ContextMenu"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing immediately via global listener
    >
      <ul>
        {options.map((option, index) => (
          <li key={index} onClick={() => handleOptionClick(option.action)}>
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContextMenu;