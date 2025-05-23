import React from 'react';
import Navbar from './Navbar';   // Import the Navbar component
import Content from './Content'; // Import the Content component
import Player from './Player';   // Import the Player component
import './Main.scss';         // Styles for the .Main container

function Main() {
  return (
    // The className is "Main" to match Main.scss
    <div className="Main">
      <Navbar />
      <Content>
        {/* This is where the children of the Content component go.
            The Content component itself is styled by Content.scss
            to take up the remaining vertical space and allow scrolling. */}
        <h1>Main Content Area</h1>
        <p>
          This is some example content within the Content component. If there's
          enough content here to exceed the available height, the Content
          component (thanks to 'overflow-y: auto;' in Content.scss) should
          provide a scrollbar.
        </p>
        {/* Add more main content elements here */}
      </Content>
      <Player />
    
    </div>
  );
}

export default Main;