import React from 'react';
import MenuItem from './MenuItem';
import './Menu.scss';

const Menu = ({
  selectedLibraryItem,
  cratesItems,
  tagsItems,
  selectedCrateItem,
  selectedTagItem,
  handleLibraryItemClick,
  handleCrateItemClick,
  handleTagItemClick,
  addItem,
  handleOpenContextMenu,
  onCrateDrop,
  onTagDrop,
  onCrateDragOver,
  onTagDragOver,
}) => {
  return (
    <div data-layer="menu" className="Menu">
      {/* LIBRARY Category (static items) */}
      <div data-layer="menu-category" className="MenuCategory">
        <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
          <div data-layer="label" className="Label">LIBRARY</div>
        </div>
        <MenuItem
          label="Tracks"
          isSelected={selectedLibraryItem === 'Tracks'}
          onClick={() => handleLibraryItemClick('Tracks')}
        />
        <MenuItem
          label="Künstler:innen"
          isSelected={selectedLibraryItem === 'Künstler:innen'}
          onClick={() => handleLibraryItemClick('Künstler:innen')}
        />
        <MenuItem
          label="Alben"
          isSelected={selectedLibraryItem === 'Alben'}
          onClick={() => handleLibraryItemClick('Alben')}
          showOptions={false}
        />
      </div>
      <div data-layer="divider" className="Divider" />

      {/* CRATES Category (dynamic items) */}
      <div data-layer="menu-category" className="MenuCategory">
        <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
          <div data-layer="label" className="Label">CRATES</div>
          <button className="AddButton" onClick={() => addItem('crates')} aria-label="Add Crate" title="Add Crate">
            <span className="AddIconSymbol">+</span>
          </button>
        </div>
        {cratesItems.map(item => (
          <MenuItem
            key={item.id}
            id={item.id}
            label={`${item.label} (${item.trackCount || 0})`}
            isSelected={selectedCrateItem === item.id}
            onClick={() => handleCrateItemClick(item.id)}
            showOptions={true}
            onOpenContextMenu={(e) => handleOpenContextMenu(e, item, 'crates')}
            onDrop={(e) => onCrateDrop && onCrateDrop(e, item.id)}
            onDragOver={onCrateDragOver}
            isDragTarget={true}
          />
        ))}
      </div>
      <div data-layer="divider" className="Divider" />

      {/* TAGS Category (dynamic items) */}
      <div data-layer="menu-category" className="MenuCategory">
        <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
          <div data-layer="label" className="Label">TAGS</div>
          <button className="AddButton" onClick={() => addItem('tags')} aria-label="Add Tag" title="Add Tag">
            <span className="AddIconSymbol">+</span>
          </button>
        </div>
        {tagsItems.map(item => (
          <MenuItem
            key={item.id}
            id={item.id}
            label={`${item.label} (${item.trackCount || 0})`}
            isSelected={selectedTagItem === item.id}
            onClick={() => handleTagItemClick(item.id)}
            showOptions={true}
            onOpenContextMenu={(e) => handleOpenContextMenu(e, item, 'tags')}
            onDrop={(e) => onTagDrop && onTagDrop(e, item.id)}
            onDragOver={onTagDragOver}
            isDragTarget={true}
          />
        ))}
      </div>
    </div>
  );
};

export default Menu;