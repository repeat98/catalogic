import React from 'react';
import './Content.scss';

const Content = ({ children }) => {
  return (
    <div data-layer="content" className="Content">
      {/* Content goes here, passed as children or fetched */}
      {children}
    </div>
  );
};

export default Content;