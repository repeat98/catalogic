import React from 'react';
import './Navbar.scss';

const TABS = ['Collection', 'Map'];

const Navbar = ({ activeTab = 'Collection', onTabChange }) => {
  return (
    <div data-layer="navbar" data-property-1="tab-bar" className="Navbar">
      <div data-layer="navbar-menu" className="NavbarMenu">
        {TABS.map(tab => (
          <div
            key={tab}
            data-layer="navbar-menu-item"
            className={`NavbarMenuItem${activeTab === tab ? ' active' : ''}`}
            onClick={() => onTabChange && onTabChange(tab)}
            style={{ cursor: 'pointer' }}
          >
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Navbar;