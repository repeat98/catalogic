import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar'; // Assuming Sidebar.jsx is in the same directory
import Main from './components/Main';       // Assuming Main.jsx is in the same directory
import { PlaybackProvider } from './context/PlaybackContext';
import { preloadAllWaveforms } from './utils/waveformPreloader'; // Import the preloader
import './App.scss';       // For AppWindow styles

const App = () => {
  // Shared state between Sidebar and Main
  const [crates, setCrates] = useState({});
  const [selectedCrateId, setSelectedCrateId] = useState(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState('Tracks');
  const [viewMode, setViewMode] = useState('library'); // 'library' or 'crate'
  
  // Crate management functions refs - will be set by Main component
  const crateManagementRef = React.useRef({});

  useEffect(() => {
    preloadAllWaveforms(); // Call the preloader on app start
  }, []); // Empty dependency array ensures it runs only once

  return (
    <PlaybackProvider>
      {/* The main application window container */}
      {/* It uses flex display to arrange Sidebar and Main components side-by-side */}
      <div data-layer="app-window" className="AppWindow">
        {/* Sidebar component for navigation and controls */}
        <Sidebar 
          crates={crates}
          selectedCrateId={selectedCrateId}
          selectedLibraryItem={selectedLibraryItem}
          onCrateSelect={setSelectedCrateId}
          onLibraryItemSelect={setSelectedLibraryItem}
          onViewModeChange={setViewMode}
          crateManagementRef={crateManagementRef}
        />
        {/* Main component to display the primary content */}
        <Main 
          crates={crates}
          setCrates={setCrates}
          selectedCrateId={selectedCrateId}
          setSelectedCrateId={setSelectedCrateId}
          selectedLibraryItem={selectedLibraryItem}
          setSelectedLibraryItem={setSelectedLibraryItem}
          viewMode={viewMode}
          setViewMode={setViewMode}
          crateManagementRef={crateManagementRef}
        />
      </div>
    </PlaybackProvider>
  );
};

export default App;
