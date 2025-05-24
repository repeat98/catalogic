import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar'; // Assuming Sidebar.jsx is in the same directory
import Main from './components/Main';       // Assuming Main.jsx is in the same directory
import { PlaybackProvider } from './context/PlaybackContext';
import { preloadAllWaveforms } from './utils/waveformPreloader'; // Import the preloader
import './App.scss';       // For AppWindow styles

const App = () => {
  useEffect(() => {
    preloadAllWaveforms(); // Call the preloader on app start
  }, []); // Empty dependency array ensures it runs only once

  return (
    <PlaybackProvider>
      {/* The main application window container */}
      {/* It uses flex display to arrange Sidebar and Main components side-by-side */}
      <div data-layer="app-window" className="AppWindow">
        {/* Sidebar component for navigation and controls */}
        <Sidebar />
        {/* Main component to display the primary content */}
        <Main />
      </div>
    </PlaybackProvider>
  );
};

export default App;
