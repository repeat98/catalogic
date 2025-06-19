import { useState, useEffect, useRef, useCallback } from 'react';
import { select, pointer } from 'd3-selection';
import { drag } from 'd3-drag';
import { line, curveBasis, curveLinear } from 'd3-shape';
import 'd3-transition';

const d3 = {
  select,
  pointer,
  drag,
  line,
  curveBasis,
  curveLinear,
};

export const useLasso = (svgRef, plotData, isEnabled) => {
  const [isLassoMode, setIsLassoMode] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  const lassoPathRef = useRef(null);
  const lassoDrawingLineRef = useRef(null);
  const isDrawingRef = useRef(false);
  const setupCompleteRef = useRef(false);

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

  // Setup lasso elements after D3 visualization is ready
  const setupLassoElements = useCallback(() => {
    if (!svgRef.current || setupCompleteRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Wait for the main SVG group to exist (created by D3 visualization)
    const mainGroup = svg.select('g');
    if (mainGroup.empty()) {
      // D3 visualization not ready yet, try again later
      setTimeout(setupLassoElements, 100);
      return;
    }
    
    // Create a defs section for patterns if it doesn't exist
    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.insert('defs', ':first-child');
    }
    
    // Create a dotted pattern for the fill
    let pattern = defs.select('#lasso-pattern');
    if (pattern.empty()) {
      pattern = defs.append('pattern')
        .attr('id', 'lasso-pattern')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 8)
        .attr('height', 8);
      
      pattern.append('rect')
        .attr('width', 8)
        .attr('height', 8)
        .attr('fill', 'rgba(106, 130, 251, 0.1)');
      
      pattern.append('circle')
        .attr('cx', 2)
        .attr('cy', 2)
        .attr('r', 1)
        .attr('fill', 'rgba(106, 130, 251, 0.3)');
      
      pattern.append('circle')
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('r', 1)
        .attr('fill', 'rgba(106, 130, 251, 0.3)');
    }
    
    // Create lasso container group at the top level (not inside the zoomable group)
    let lassoGroup = svg.select('.lasso-group');
    if (lassoGroup.empty()) {
      lassoGroup = svg.append('g')
        .attr('class', 'lasso-group')
        .style('pointer-events', 'none');
    }
    
    // Add lasso path for filled area (final selection)
    if (lassoGroup.select('.lasso-path').empty()) {
      lassoPathRef.current = lassoGroup.append("path")
        .attr("class", "lasso-path")
        .style("fill", "url(#lasso-pattern)")
        .style("stroke", "#6A82FB")
        .style("stroke-width", "2")
        .style("stroke-dasharray", "5,5")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("z-index", "1000");
    }
    
    // Add drawing line (visible while drawing)
    if (lassoGroup.select('.lasso-drawing-line').empty()) {
      lassoDrawingLineRef.current = lassoGroup.append("path")
        .attr("class", "lasso-drawing-line")
        .style("fill", "none")
        .style("stroke", "#FF6B6B")
        .style("stroke-width", "3")
        .style("stroke-linecap", "round")
        .style("stroke-linejoin", "round")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("opacity", 0.8)
        .style("z-index", "1001");
    }
    
    setupCompleteRef.current = true;
  }, []);

  // Setup lasso interaction
  useEffect(() => {
    if (!svgRef.current || !plotData.length || !isEnabled) return;

    // Reset setup flag when plotData changes significantly
    setupCompleteRef.current = false;
    
    // Setup lasso elements
    setupLassoElements();

    const svg = d3.select(svgRef.current);

    const handleMouseDown = (event) => {
      if (event.target.classList.contains('track-dot')) return;
      if (!isLassoMode || !isShiftPressed) return;
      
      event.stopPropagation();
      isDrawingRef.current = true;
      const [x, y] = d3.pointer(event);
      setLassoPoints([[x, y]]);
      
      // Ensure elements are setup
      if (!setupCompleteRef.current) {
        setupLassoElements();
      }
      
      // Show the drawing line
      if (lassoDrawingLineRef.current) {
        lassoDrawingLineRef.current.style("display", "block");
      }
      // Hide the filled area while drawing
      if (lassoPathRef.current) {
        lassoPathRef.current.style("display", "none");
      }
    };

    const handleMouseMove = (event) => {
      if (event.target.classList.contains('track-dot')) return;
      if (!isLassoMode || !isDrawingRef.current || !isShiftPressed) return;
      
      event.stopPropagation();
      const [x, y] = d3.pointer(event);
      
      setLassoPoints(prev => {
        const newPoints = [...prev, [x, y]];
        
        // Update drawing line (visible while drawing)
        const lineGenerator = d3.line()
          .x(d => d[0])
          .y(d => d[1])
          .curve(d3.curveBasis); // Smoother curve for drawing
        
        if (lassoDrawingLineRef.current) {
          lassoDrawingLineRef.current.attr("d", lineGenerator(newPoints));
        }
        
        return newPoints;
      });
    };

    const handleMouseUp = (event) => {
      if (event.target.classList.contains('track-dot')) return;
      if (!isLassoMode || !isDrawingRef.current) return;
      
      event.stopPropagation();
      isDrawingRef.current = false;
      
      // Hide the drawing line
      if (lassoDrawingLineRef.current) {
        lassoDrawingLineRef.current.style("display", "none");
      }
      
      // Close the lasso path and show the filled area
      const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveLinear);
      
      const closedPoints = [...lassoPoints, lassoPoints[0]];
      
      // Show the filled selection area
      if (lassoPathRef.current) {
        lassoPathRef.current.attr("d", lineGenerator(closedPoints));
        lassoPathRef.current.style("display", "block");
      }
      
      // Get the current transform
      const transform = d3.zoomTransform(svg.node());
      
      // Check which points are inside the lasso
      const selectedPoints = plotData.filter(point => {
        const transformedX = point.x * transform.k + transform.x;
        const transformedY = point.y * transform.k + transform.y;
        return d3.polygonContains(closedPoints, [transformedX, transformedY]);
      });
      
      setSelectedTracks(selectedPoints);
      
      // Clear the lasso after a brief moment to show the selection
      setTimeout(() => {
        setLassoPoints([]);
        if (lassoPathRef.current) {
          lassoPathRef.current.style("display", "none");
        }
      }, 2000);
    };

    svg.on("mousedown", handleMouseDown)
       .on("mousemove", handleMouseMove)
       .on("mouseup", handleMouseUp);

    return () => {
      svg.on("mousedown", null)
         .on("mousemove", null)
         .on("mouseup", null);
    };
  }, [isLassoMode, plotData, lassoPoints, isShiftPressed, isEnabled, setupLassoElements]);

  // Cleanup when component unmounts or lasso is disabled
  useEffect(() => {
    if (!isEnabled || !svgRef.current) {
      setupCompleteRef.current = false;
    }
  }, [isEnabled]);

  const toggleLassoMode = useCallback(() => {
    setIsLassoMode(prev => {
      const newMode = !prev;
      if (!newMode) {
        setLassoPoints([]);
        if (lassoPathRef.current) {
          lassoPathRef.current.style("display", "none");
        }
        if (lassoDrawingLineRef.current) {
          lassoDrawingLineRef.current.style("display", "none");
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
    if (lassoDrawingLineRef.current) {
      lassoDrawingLineRef.current.style("display", "none");
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