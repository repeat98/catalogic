import React, { useState } from 'react';
import MenuItem from './MenuItem'; // Import the refactored MenuItem component
import './Sidebar.scss';

const Sidebar = () => {
  const [selectedItem, setSelectedItem] = useState('Tracks'); // Example state for selected item in LIBRARY

  // Example state for selected item in CRATES, if needed
  // const [selectedCrateItem, setSelectedCrateItem] = useState(null);

  const handleLibraryItemClick = (itemName) => {
    setSelectedItem(itemName);
    // Add navigation logic here if needed
  };

  // Example handler for items under CRATES
  // const handleCrateItemClick = (itemName) => {
  //   setSelectedCrateItem(itemName);
  // };

  return (
    <div data-layer="sidebar" className="Sidebar">
      <div data-layer="window-controls" className="WindowControlsOuter">
        <div data-layer="Window Controls" data-style="Standard" className="WindowControlsInner">
          {/* <div data-layer="Close" className="Close" /> */}
          {/* <div data-layer="Minimize" className="Minimize" /> */}
          {/* <div data-layer="Zoom" className="Zoom" /> */}
        </div>
      </div>
      <div data-layer="menu" className="Menu">
        <div data-layer="menu-category" className="MenuCategory">
          <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
            <div data-layer="label" className="Label">LIBRARY</div>
          </div>
          <MenuItem
            label="Tracks"
            isSelected={selectedItem === 'Tracks'}
            onClick={() => handleLibraryItemClick('Tracks')}
          />
          <MenuItem
            label="Künstler:innen"
            isSelected={selectedItem === 'Künstler:innen'}
            onClick={() => handleLibraryItemClick('Künstler:innen')}
          />
          <MenuItem
            label="Alben"
            isSelected={selectedItem === 'Alben'}
            onClick={() => handleLibraryItemClick('Alben')}
            showOptions={false} // Options dots removed for Alben
          />
        </div>
        <div data-layer="divider" className="Divider" />
        <div data-layer="menu-category" className="MenuCategory">
          <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
            <div data-layer="label" className="Label">CRATES</div>
          </div>
          {/* MenuItems for CRATES category would go here */}
          {/* Example:
          <MenuItem
            label="My First Crate"
            isSelected={selectedCrateItem === 'My First Crate'}
            onClick={() => handleCrateItemClick('My First Crate')}
            showOptions={true}
          />
          <MenuItem
            label="DJ Set List"
            isSelected={selectedCrateItem === 'DJ Set List'}
            onClick={() => handleCrateItemClick('DJ Set List')}
          />
          */}
        </div>
        <div data-layer="divider" className="Divider" />
        <div data-layer="menu-category" className="MenuCategory">
          <div data-layer="category-label-wrapper" className="CategoryLabelWrapper">
            <div data-layer="label" className="Label">MY TAGS</div>
          </div>
          {/* MenuItems for MY TAGS category would go here */}
        </div>
      </div>
      <div data-layer="logo-container" className="LogoContainer">
        <div data-layer="logo-wrapper" className="LogoWrapper">
          <div data-layer="logo" className="Logo" />
          <div data-layer="logo-text" className="LogoText">Catalogic</div>
        </div>
        <div data-layer="icon-settings" className="IconSettings">
          <div data-layer="Vector" className="Vector" /> {/* Settings icon */}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;