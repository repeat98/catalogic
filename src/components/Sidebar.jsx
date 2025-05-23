import React, { useState, useEffect, useCallback, useRef } from 'react';
import Menu from './Menu'; // Import the new Menu component
import ContextMenu from './ContextMenu';
import './Sidebar.scss';

// Helper to generate simple unique IDs
const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Sidebar = () => {
  const [selectedLibraryItem, setSelectedLibraryItem] = useState('Tracks');

  // State for dynamic items
  const [cratesItems, setCratesItems] = useState([
    { id: generateId(), label: 'My First Crate' },
    { id: generateId(), label: 'DJ Set List' },
  ]);
  const [myTagsItems, setMyTagsItems] = useState([
    { id: generateId(), label: 'Red Hot' },
  ]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    item: null, // { id, label }
    categoryType: null, // 'crates' or 'mytags'
  });

  const sidebarRef = useRef(null); // Ref for the sidebar to detect outside clicks

  const handleLibraryItemClick = (itemName) => {
    setSelectedLibraryItem(itemName);
    setContextMenu({ isOpen: false }); // Close context menu on other interactions
  };

  // --- Item Management Functions ---
  const addItem = (categoryType) => {
    const newItemLabel = prompt(`Enter name for new ${categoryType === 'crates' ? 'Crate' : 'Tag'}:`);
    if (newItemLabel && newItemLabel.trim() !== '') {
      const newItem = { id: generateId(), label: newItemLabel.trim() };
      if (categoryType === 'crates') {
        setCratesItems(prev => [...prev, newItem]);
      } else if (categoryType === 'mytags') {
        setMyTagsItems(prev => [...prev, newItem]);
      }
    }
    setContextMenu({ isOpen: false });
  };

  const deleteItem = (itemId, categoryType) => {
    if (window.confirm(`Are you sure you want to delete this ${categoryType === 'crates' ? 'crate' : 'tag'}?`)) {
      if (categoryType === 'crates') {
        setCratesItems(prev => prev.filter(item => item.id !== itemId));
      } else if (categoryType === 'mytags') {
        setMyTagsItems(prev => prev.filter(item => item.id !== itemId));
      }
    }
    setContextMenu({ isOpen: false });
  };

  const renameItem = (itemId, currentLabel, categoryType) => {
    const newItemLabel = prompt(`Enter new name for "${currentLabel}":`, currentLabel);
    if (newItemLabel && newItemLabel.trim() !== '' && newItemLabel.trim() !== currentLabel) {
      const updateFn = (prevItems) => prevItems.map(item =>
        item.id === itemId ? { ...item, label: newItemLabel.trim() } : item
      );
      if (categoryType === 'crates') {
        setCratesItems(updateFn);
      } else if (categoryType === 'mytags') {
        setMyTagsItems(updateFn);
      }
    }
    setContextMenu({ isOpen: false });
  };

  // --- Context Menu Logic ---
  const handleOpenContextMenu = (event, item, categoryType) => {
    event.preventDefault(); // Prevent native context menu
    event.stopPropagation();

    const sidebarRect = sidebarRef.current ? sidebarRef.current.getBoundingClientRect() : { top: 0, left: 0, width: 256, height: window.innerHeight };

    let x = event.clientX;
    let y = event.clientY;

    if (x + 200 > sidebarRect.left + sidebarRect.width) {
        x = sidebarRect.left + sidebarRect.width - 200;
    }
     if (y + 100 > sidebarRect.top + sidebarRect.height) {
        y = sidebarRect.top + sidebarRect.height - 100;
    }

    setContextMenu({
      isOpen: true,
      x: x,
      y: y,
      item,
      categoryType,
    });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu.isOpen && !event.target.closest('.ContextMenu')) {
        handleCloseContextMenu();
      }
    };
    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.isOpen, handleCloseContextMenu]);


  const contextMenuItems = contextMenu.item ? [
    {
      label: 'Rename',
      action: () => renameItem(contextMenu.item.id, contextMenu.item.label, contextMenu.categoryType),
    },
    {
      label: 'Delete',
      action: () => deleteItem(contextMenu.item.id, contextMenu.categoryType),
    },
  ] : [];


  return (
    <div data-layer="sidebar" className="Sidebar" ref={sidebarRef}>
      <div data-layer="window-controls" className="WindowControlsOuter">
        <div data-layer="Window Controls" data-style="Standard" className="WindowControlsInner">
          {/* Window controls */}
        </div>
      </div>
      <Menu
        selectedLibraryItem={selectedLibraryItem}
        cratesItems={cratesItems}
        myTagsItems={myTagsItems}
        handleLibraryItemClick={handleLibraryItemClick}
        addItem={addItem}
        handleOpenContextMenu={handleOpenContextMenu}
        // selectedCrateItem, handleCrateItemClick, selectedTagItem, handleTagItemClick would be passed here if implemented
      />
      <div data-layer="logo-container" className="LogoContainer">
        {/* Logo */}
      </div>
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenuItems}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default Sidebar;