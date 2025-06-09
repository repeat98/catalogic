import React, { useState, useEffect, useCallback, useRef } from 'react';
import Menu from './Menu'; // Import the new Menu component
import ContextMenu from './ContextMenu';
import TextInputModal from './TextInputModal';
import './Sidebar.scss';

// Helper to generate simple unique IDs
const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Sidebar = ({ 
  crates,
  tags,
  selectedCrateId,
  selectedTagId,
  selectedLibraryItem,
  onCrateSelect,
  onTagSelect,
  onLibraryItemSelect,
  onViewModeChange,
  crateManagementRef,
  tagManagementRef
}) => {
  // Convert crates object to array format for UI
  const cratesItems = Object.entries(crates).map(([id, crate]) => ({
    id,
    label: crate.name,
    trackCount: crate.tracks ? crate.tracks.length : 0
  }));

  // Convert tags object to array format for UI
  const tagsItems = Object.entries(tags).map(([id, tag]) => ({
    id,
    label: tag.name,
    trackCount: tag.tracks ? tag.tracks.length : 0
  }));

  const [myTagsItems, setMyTagsItems] = useState([
    { id: generateId(), label: 'Red Hot' },
  ]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    item: null, // { id, label }
    categoryType: null, // 'crates' or 'tags'
  });

  // Modal State
  const [modal, setModal] = useState({
    isOpen: false,
    type: null, // 'create', 'rename'
    title: '',
    placeholder: '',
    defaultValue: '',
    categoryType: null,
    itemId: null,
    currentLabel: null
  });

  const sidebarRef = useRef(null); // Ref for the sidebar to detect outside clicks

  const handleLibraryItemClick = (itemName) => {
    onLibraryItemSelect(itemName);
    onViewModeChange('library');
    setContextMenu({ isOpen: false }); // Close context menu on other interactions
  };

  const handleCrateItemClick = (crateId) => {
    onCrateSelect(crateId);
    onViewModeChange('crate');
    setContextMenu({ isOpen: false });
  };

  const handleTagItemClick = (tagId) => {
    onTagSelect(tagId);
    onViewModeChange('tag');
    setContextMenu({ isOpen: false });
  };

  // --- Item Management Functions ---
  const addItem = (categoryType) => {
    setModal({
      isOpen: true,
      type: 'create',
      title: `Create New ${categoryType === 'crates' ? 'Crate' : 'Tag'}`,
      placeholder: `Enter ${categoryType === 'crates' ? 'crate' : 'tag'} name...`,
      defaultValue: '',
      categoryType,
      itemId: null,
      currentLabel: null
    });
    setContextMenu({ isOpen: false });
  };

  const deleteItem = async (itemId, categoryType) => {
    if (window.confirm(`Are you sure you want to delete this ${categoryType === 'crates' ? 'crate' : 'tag'}?`)) {
      if (categoryType === 'crates' && crateManagementRef.current?.deleteCrate) {
        await crateManagementRef.current.deleteCrate(itemId);
      } else if (categoryType === 'tags' && tagManagementRef.current?.deleteTag) {
        await tagManagementRef.current.deleteTag(itemId);
      } else if (categoryType === 'mytags') {
        setMyTagsItems(prev => prev.filter(item => item.id !== itemId));
      }
    }
    setContextMenu({ isOpen: false });
  };

  const renameItem = (itemId, currentLabel, categoryType) => {
    setModal({
      isOpen: true,
      type: 'rename',
      title: `Rename ${categoryType === 'crates' ? 'Crate' : 'Tag'}`,
      placeholder: `Enter new name...`,
      defaultValue: currentLabel,
      categoryType,
      itemId,
      currentLabel
    });
    setContextMenu({ isOpen: false });
  };

  // --- Modal Management Functions ---
  const handleModalConfirm = async (inputValue) => {
    const { type, categoryType, itemId, currentLabel } = modal;
    
    if (type === 'create') {
      if (categoryType === 'crates' && crateManagementRef.current?.createCrate) {
        await crateManagementRef.current.createCrate(inputValue);
      } else if (categoryType === 'tags' && tagManagementRef.current?.createTag) {
        await tagManagementRef.current.createTag(inputValue);
      } else if (categoryType === 'mytags') {
        const newItem = { id: generateId(), label: inputValue };
        setMyTagsItems(prev => [...prev, newItem]);
      }
    } else if (type === 'rename') {
      if (inputValue !== currentLabel) {
        if (categoryType === 'crates' && crateManagementRef.current?.renameCrate) {
          await crateManagementRef.current.renameCrate(itemId, inputValue);
        } else if (categoryType === 'tags' && tagManagementRef.current?.renameTag) {
          await tagManagementRef.current.renameTag(itemId, inputValue);
        } else if (categoryType === 'mytags') {
          const updateFn = (prevItems) => prevItems.map(item =>
            item.id === itemId ? { ...item, label: inputValue } : item
          );
          setMyTagsItems(updateFn);
        }
      }
    }
    
    setModal({ ...modal, isOpen: false });
  };

  const handleModalClose = async (value) => {
    if (value && modal.isOpen) {
      if (modal.type === 'create') {
        if (modal.categoryType === 'crates') {
          await crateManagementRef.current.createCrate(value);
        } else if (modal.categoryType === 'tags') {
          await tagManagementRef.current.createTag(value);
        } else if (modal.categoryType === 'mytags') {
          const newItem = { id: generateId(), label: value };
          setMyTagsItems(prev => [...prev, newItem]);
        }
      } else if (modal.type === 'rename') {
        if (modal.categoryType === 'crates' && crateManagementRef.current?.renameCrate) {
          await crateManagementRef.current.renameCrate(modal.itemId, value);
        } else if (modal.categoryType === 'tags' && tagManagementRef.current?.renameTag) {
          await tagManagementRef.current.renameTag(modal.itemId, value);
        } else if (modal.categoryType === 'mytags') {
          const updateFn = (prevItems) => prevItems.map(item =>
            item.id === modal.itemId ? { ...item, label: value } : item
          );
          setMyTagsItems(updateFn);
        }
      }
    }
    setModal({ isOpen: false });
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
        tagsItems={tagsItems}
        myTagsItems={myTagsItems}
        selectedCrateItem={selectedCrateId}
        selectedTagItem={selectedTagId}
        handleLibraryItemClick={handleLibraryItemClick}
        handleCrateItemClick={handleCrateItemClick}
        handleTagItemClick={handleTagItemClick}
        addItem={addItem}
        handleOpenContextMenu={handleOpenContextMenu}
        onCrateDrop={(event, crateId) => {
          event.preventDefault();
          console.log('Crate drop event:', { crateId, dataTransfer: event.dataTransfer });
          try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            console.log('Parsed drop data:', data);
            if (data.trackId && crateManagementRef.current?.addTrackToCrate) {
              console.log('Calling addTrackToCrate via ref');
              crateManagementRef.current.addTrackToCrate(crateId, data.trackId);
            } else {
              console.log('Missing trackId or addTrackToCrate function:', {
                trackId: data.trackId,
                hasFunction: !!crateManagementRef.current?.addTrackToCrate
              });
            }
          } catch (error) {
            console.error('Error handling crate drop:', error);
          }
        }}
        onTagDrop={(event, tagId) => {
          event.preventDefault();
          console.log('Tag drop event:', { tagId, dataTransfer: event.dataTransfer });
          try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            console.log('Parsed drop data:', data);
            if (data.trackId && tagManagementRef.current?.addTrackToTag) {
              console.log('Calling addTrackToTag via ref');
              tagManagementRef.current.addTrackToTag(tagId, data.trackId);
            } else {
              console.log('Missing trackId or addTrackToTag function:', {
                trackId: data.trackId,
                hasFunction: !!tagManagementRef.current?.addTrackToTag
              });
            }
          } catch (error) {
            console.error('Error handling tag drop:', error);
          }
        }}
        onCrateDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onTagDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
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
      <TextInputModal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        title={modal.title}
        placeholder={modal.placeholder}
        defaultValue={modal.defaultValue}
      />
    </div>
  );
};

export default Sidebar;