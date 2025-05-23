import React from 'react';
import MenuItem from './MenuItem';
import './Menu.scss';

const Menu = ({
  selectedLibraryItem,
  cratesItems,
  myTagsItems,
  handleLibraryItemClick,
  addItem,
  handleOpenContextMenu,
  // selectedCrateItem, // Prop for future selection handling
  // handleCrateItemClick, // Prop for future selection handling
  // selectedTagItem, // Prop for future selection handling
  // handleTagItemClick, // Prop for future selection handling
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
            label={item.label}
            // isSelected={selectedCrateItem === item.id} // Implement selection if needed
            // onClick={() => handleCrateItemClick(item.id)} // Implement selection if needed
            showOptions={true}
            onOpenContextMenu={(e) => handleOpenContextMenu(e, item, 'crates')}
          />
        ))}
      </div>
      <div data-layer="divider" className="Divider" />

      {/* MY TAGS Category (dynamic items) */}
      <div data-layer="menu-category" className="MenuCategory">
        <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
          <div data-layer="label" className="Label">MY TAGS</div>
          <button className="AddButton" onClick={() => addItem('mytags')} aria-label="Add Tag" title="Add Tag">
            <span className="AddIconSymbol">+</span>
          </button>
        </div>
        {myTagsItems.map(item => (
          <MenuItem
            key={item.id}
            id={item.id}
            label={item.label}
            // isSelected={selectedTagItem === item.id} // Implement selection if needed
            // onClick={() => handleTagItemClick(item.id)} // Implement selection if needed
            showOptions={true}
            onOpenContextMenu={(e) => handleOpenContextMenu(e, item, 'mytags')}
          />
        ))}
      </div>
    </div>
  );
};

export default Menu;