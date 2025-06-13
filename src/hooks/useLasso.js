import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

export const useLasso = (svgRef, plotData, isEnabled) => {
  const [isLassoMode, setIsLassoMode] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  const lassoPathRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Handle keyboard events for Shift key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Shift') setIsShiftPressed(true);
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Setup lasso interaction
  useEffect(() => {
    if (!svgRef.current || !plotData.length || !isEnabled) return;

    const svg = d3.select(svgRef.current);
    
    // Add lasso path if it doesn't exist
    if (!lassoPathRef.current) {
      lassoPathRef.current = svg.append("path")
        .attr("class", "lasso-path")
        .style("fill", "rgba(106, 130, 251, 0.1)")
        .style("stroke", "#6A82FB")
        .style("stroke-width", "2")
        .style("pointer-events", "none")
        .style("display", "none");
    }

    const handleMouseDown = (event) => {
      if (event.target.classList.contains('track-dot')) return;
      if (!isLassoMode || !isShiftPressed) return;
      
      event.stopPropagation();
      isDrawingRef.current = true;
      const [x, y] = d3.pointer(event);
      setLassoPoints([[x, y]]);
      lassoPathRef.current.style("display", "block");
    };

    const handleMouseMove = (event) => {
      if (event.target.classList.contains('track-dot')) return;
      if (!isLassoMode || !isDrawingRef.current || !isShiftPressed) return;
      
      event.stopPropagation();
      const [x, y] = d3.pointer(event);
      
      setLassoPoints(prev => {
        const newPoints = [...prev, [x, y]];
        
        // Update lasso path
        const lineGenerator = d3.line()
          .x(d => d[0])
          .y(d => d[1])
          .curve(d3.curveLinear);
        
        lassoPathRef.current?.attr("d", lineGenerator(newPoints));
        
        return newPoints;
      });
    };

    const handleMouseUp = (event) => {
      if (event.target.classList.contains('track-dot')) return;
      if (!isLassoMode || !isDrawingRef.current) return;
      
      event.stopPropagation();
      isDrawingRef.current = false;
      
      // Close the lasso path
      const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveLinear);
      
      const closedPoints = [...lassoPoints, lassoPoints[0]];
      lassoPathRef.current?.attr("d", lineGenerator(closedPoints));
      
      // Get the current transform
      const transform = d3.zoomTransform(svg.node());
      
      // Check which points are inside the lasso
      const selectedPoints = plotData.filter(point => {
        const transformedX = point.x * transform.k + transform.x;
        const transformedY = point.y * transform.k + transform.y;
        return d3.polygonContains(closedPoints, [transformedX, transformedY]);
      });
      
      setSelectedTracks(selectedPoints);
      setLassoPoints([]);
      lassoPathRef.current?.style("display", "none");
    };

    svg.on("mousedown", handleMouseDown)
       .on("mousemove", handleMouseMove)
       .on("mouseup", handleMouseUp);

    return () => {
      svg.on("mousedown", null)
         .on("mousemove", null)
         .on("mouseup", null);
    };
  }, [isLassoMode, plotData, lassoPoints, isShiftPressed, isEnabled]);

  const toggleLassoMode = useCallback(() => {
    setIsLassoMode(prev => {
      const newMode = !prev;
      if (!newMode) {
        setLassoPoints([]);
        if (lassoPathRef.current) {
          lassoPathRef.current.style("display", "none");
        }
      }
      return newMode;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTracks([]);
    setLassoPoints([]);
    if (lassoPathRef.current) {
      lassoPathRef.current.style("display", "none");
    }
  }, []);

  return {
    isLassoMode,
    selectedTracks,
    isShiftPressed,
    toggleLassoMode,
    clearSelection,
    setSelectedTracks
  };
}; 