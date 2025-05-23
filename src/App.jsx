import React from 'react';
import Sidebar from './components/Sidebar'; // Assuming Sidebar.jsx is in the same directory
import Main from './components/Main';       // Assuming Main.jsx is in the same directory
import './App.scss';       // For AppWindow styles

const App = () => {
  return (
    // The main application window container
    // It uses flex display to arrange Sidebar and Main components side-by-side
    <div data-layer="app-window" className="AppWindow">
      {/* Sidebar component for navigation and controls */}
      <Sidebar />
      {/* Main component to display the primary content */}
      <Main />
    </div>
  );
};

export default App;
