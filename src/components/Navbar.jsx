import React from 'react';
import './Navbar.scss';

const TABS = ['Collection', 'Map', 'Tags', 'Insights'];

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
      <div data-layer="window-control" className="WindowControl">
        <div data-layer="icons" className="Icons FullWindowIconContainer">
          <div data-layer="full-window" className="FullWindow">
            <div data-layer="Rectangle 16" className="Rectangle16" />
            <div data-layer="Rectangle 17" className="Rectangle17Full" />
            {/* Rectangle 18 seems to be a positioning element or border, often handled by parent or sibling styles */}
            {/* <div data-layer="Rectangle 18" className="Rectangle18" /> */}
          </div>
        </div>
        <div data-layer="Rectangle 20" className="WindowControlDivider" />
        <div data-layer="icons" className="Icons TwoWindowIconContainer">
          <div data-layer="two-window" className="TwoWindow">
            <div data-layer="Rectangle 16" className="Rectangle16" />
            <div data-layer="Rectangle 17" className="Rectangle17Two" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;