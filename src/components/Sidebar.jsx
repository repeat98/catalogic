import React from 'react';
import './Sidebar.scss';

const Sidebar = () => {
  return (
    <div data-layer="sidebar" className="Sidebar">
      <div data-layer="window-controls" className="WindowControlsOuter">
        <div data-layer="Window Controls" data-style="Standard" className="WindowControlsInner">
       
        </div>
      </div>
      <div data-layer="menu" className="Menu">
        <div data-layer="menu-category" className="MenuCategory">
          <div data-layer="library-menu" className="LibraryMenu">
            <div data-layer="label" className="Label">LIBRARY</div>
          </div>
          <div data-layer="menu-item" className="MenuItem">
            <div data-layer="label" className="Label">CRATES</div>
          </div>
        </div>
        <div data-layer="divider" className="Divider" />
        <div data-layer="menu-category" className="MenuCategory">
          <div data-layer="label" className="Label">MY TAGS</div>
        </div>
      </div>
      <div data-layer="logo-container" className="LogoContainer">
        <div data-layer="logo-wrapper" className="LogoWrapper">
          <div data-layer="logo" className="Logo" />
          <div data-layer="logo-text" className="LogoText">Catalogic</div>
        </div>
        <div data-layer="icon-settings" className="IconSettings">
          <div data-layer="Vector" className="Vector" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;