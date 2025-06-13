import React, { useRef, useEffect, useState } from 'react';
import { useD3Visualization } from '../hooks/useD3Visualization.js';
import { useLasso } from '../hooks/useLasso.js';

const Visualization = ({
  plotData,
  trackColors,
  onTrackHover,
  onTrackOut,
  onTrackClick,
  isLassoEnabled,
  onLassoToggle,
  onLassoSelection
}) => {
  const svgRef = useRef(null);
  const viewModeRef = useRef(null);
  const [svgDimensions, setSvgDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight - 150 
  });

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (viewModeRef.current) {
        setSvgDimensions({
          width: viewModeRef.current.clientWidth,
          height: viewModeRef.current.clientHeight,
        });
      } else {
        setSvgDimensions({ 
          width: window.innerWidth, 
          height: window.innerHeight - 180 
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Use D3 visualization hook
  const { resetZoom } = useD3Visualization(
    svgRef,
    plotData,
    svgDimensions,
    trackColors,
    onTrackHover,
    onTrackOut,
    onTrackClick
  );

  // Use lasso selection hook
  const { 
    isLassoMode, 
    selectedTracks, 
    isShiftPressed, 
    toggleLassoMode, 
    clearSelection 
  } = useLasso(svgRef, plotData, isLassoEnabled);

  // Pass lasso state up to parent
  useEffect(() => {
    if (onLassoSelection) {
      onLassoSelection(selectedTracks);
    }
  }, [selectedTracks, onLassoSelection]);

  // Pass lasso toggle up to parent
  useEffect(() => {
    if (onLassoToggle) {
      onLassoToggle(isLassoMode, isShiftPressed, toggleLassoMode, clearSelection);
    }
  }, [isLassoMode, isShiftPressed, toggleLassoMode, clearSelection, onLassoToggle]);

  return (
    <div className="visualization-area" ref={viewModeRef}>
      <svg
        ref={svgRef}
        className="track-plot"
        aria-labelledby="plotTitle"
        role="graphics-document"
        style={{ width: '100%', height: '100%' }}
      >
        <title id="plotTitle">Track Similarity Plot</title>
      </svg>
    </div>
  );
};

export default Visualization; 