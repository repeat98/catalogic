import { useRef, useEffect, useCallback } from 'react';
import { select, pointer } from 'd3-selection';
import { zoom, zoomTransform, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import { line, curveBasis, curveLinear } from 'd3-shape';
import 'd3-transition';

// Compose a minimal d3 namespace with only the used utilities
const d3 = {
  select,
  pointer,
  zoom,
  zoomTransform,
  zoomIdentity,
  drag,
  line,
  curveBasis,
  curveLinear,
};

export const useD3Visualization = (
  svgRef, 
  plotData, 
  svgDimensions, 
  trackColors,
  onTrackHover,
  onTrackOut,
  onTrackClick,
  visualizationMode,
  xAxisFeature,
  yAxisFeature
) => {
  const d3ContainerRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const lastZoomStateRef = useRef({ k: 1, x: 0, y: 0 });

  // Initialize D3 visualization structure (only when SVG or dimensions change)
  useEffect(() => {
    if (!svgRef.current) return;

    // Ensure dimensions are valid
    const safeWidth = svgDimensions.width > 0 ? svgDimensions.width : 800;
    const safeHeight = svgDimensions.height > 0 ? svgDimensions.height : 600;

    // Clear any existing visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", safeWidth)
      .attr("height", safeHeight)
      .attr("viewBox", `0 0 ${safeWidth} ${safeHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");
    let isUpdatingTransform = false;

    // Initialize zoom behavior
    zoomBehaviorRef.current = d3.zoom()
      .scaleExtent([0.5, 50])
      .filter((event) => {
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey;
        if (event.type === 'mousedown') return event.button === 1;
        return true;
      })
      .on("zoom", (event) => {
        if (isUpdatingTransform) return;
        
        const currentTransform = d3.zoomTransform(svg.node());
        const attemptedTransform = event.transform;
        const scaleChange = attemptedTransform.k / currentTransform.k;
        const isPanOperation = Math.abs(scaleChange - 1) < 0.01;
        
        let finalTransform = attemptedTransform;
        
        if (isPanOperation && currentTransform.k > 1) {
          const dx = (attemptedTransform.x - currentTransform.x) / currentTransform.k;
          const dy = (attemptedTransform.y - currentTransform.y) / currentTransform.k;
          finalTransform = currentTransform.translate(dx, dy);
          
          isUpdatingTransform = true;
          svg.call(zoomBehaviorRef.current.transform, finalTransform);
          isUpdatingTransform = false;
        }
        
        lastZoomStateRef.current = finalTransform;
        g.attr("transform", finalTransform);
        
        if (d3ContainerRef.current?.dots) {
          d3ContainerRef.current.dots.attr("r", 4 / finalTransform.k);
        }
      });

    svg.call(zoomBehaviorRef.current);

    // Handle trackpad two-finger swipe panning
    svg.on("wheel", function(event) {
      if (event.ctrlKey || event.metaKey) return;
      
      const hasHorizontalScroll = Math.abs(event.deltaX) > 0;
      const hasSmallDelta = Math.abs(event.deltaY) < 50 && Math.abs(event.deltaY) > 0;
      const isFloatingPoint = (event.deltaY % 1) !== 0;
      const isTrackpad = hasHorizontalScroll || hasSmallDelta || isFloatingPoint;
      
      if (isTrackpad) {
        event.preventDefault();
        event.stopPropagation();
        
        const currentTransform = d3.zoomTransform(svg.node());
        const scaledDeltaX = -event.deltaX / currentTransform.k;
        const scaledDeltaY = -event.deltaY / currentTransform.k;
        const newTransform = currentTransform.translate(scaledDeltaX, scaledDeltaY);
        
        lastZoomStateRef.current = newTransform;
        g.attr("transform", newTransform);
        
        if (d3ContainerRef.current?.dots) {
          d3ContainerRef.current.dots.attr("r", 4 / newTransform.k);
        }
        
        svg.property("__zoom", newTransform);
      }
    });

    // Apply last known zoom state
    if (lastZoomStateRef.current.k !== 1 || lastZoomStateRef.current.x !== 0 || lastZoomStateRef.current.y !== 0) {
      const transform = d3.zoomIdentity
        .translate(lastZoomStateRef.current.x, lastZoomStateRef.current.y)
        .scale(lastZoomStateRef.current.k);
      svg.call(zoomBehaviorRef.current.transform, transform);
    }

    // Store D3 container reference
    d3ContainerRef.current = { svg, g, dots: null };

    // Cleanup function
    return () => {
      if (d3ContainerRef.current) {
        d3ContainerRef.current.svg.selectAll("*").remove();
      }
    };
  }, [svgDimensions]); // Only depend on dimensions, not plotData

  // Update axis labels when in XY mode
  useEffect(() => {
    if (!d3ContainerRef.current?.svg || !visualizationMode) return;

    const svg = d3ContainerRef.current.svg;
    const safeWidth = svgDimensions.width > 0 ? svgDimensions.width : 800;
    const safeHeight = svgDimensions.height > 0 ? svgDimensions.height : 600;

    // Remove existing axis labels
    svg.selectAll(".axis-label").remove();

    // Add axis labels only in XY mode
    if (visualizationMode === 'xy' && (xAxisFeature || yAxisFeature)) {
      // X-axis label
      if (xAxisFeature) {
        svg.append("text")
          .attr("class", "axis-label x-axis-label")
          .attr("x", safeWidth / 2)
          .attr("y", safeHeight - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "500")
          .style("fill", "#e0e0e0")
          .style("font-family", "Inter, sans-serif")
          .text(xAxisFeature);
      }

      // Y-axis label (rotated)
      if (yAxisFeature) {
        svg.append("text")
          .attr("class", "axis-label y-axis-label")
          .attr("x", -safeHeight / 2)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .attr("transform", "rotate(-90)")
          .style("font-size", "14px")
          .style("font-weight", "500")
          .style("fill", "#e0e0e0")
          .style("font-family", "Inter, sans-serif")
          .text(yAxisFeature);
      }
    }
  }, [visualizationMode, xAxisFeature, yAxisFeature, svgDimensions]);

  // Update dots when plotData or trackColors change
  useEffect(() => {
    if (!d3ContainerRef.current?.g || !plotData.length) {
      return;
    }

    const g = d3ContainerRef.current.g;

    // Data join
    const dots = g.selectAll("circle.track-dot")
      .data(plotData, d => d.id);

    // Remove old dots
    dots.exit()
      .transition()
      .duration(300)
      .attr("r", 0)
      .remove();

    // Add new dots - start with visible radius, not 0
    const dotsEnter = dots.enter()
      .append("circle")
      .attr("class", "track-dot")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 4 / lastZoomStateRef.current.k) // Start with visible radius
      .attr("fill", "#AAAAAA") // Default fill
      .style("cursor", "grab")
      .style("pointer-events", "all")
      .on("mouseover", (event, d) => onTrackHover?.(d, event))
      .on("mouseout", onTrackOut)
      .on("click", (event, d) => onTrackClick?.(d))
      .call(d3.drag()
        .filter((event) => {
          // Only allow drag on left mouse button and when not in lasso mode with shift
          return event.button === 0 && !(event.shiftKey);
        })
        .on("start", (event, d) => {
          // Prevent event bubbling to parent SVG
          event.sourceEvent.stopPropagation();
          event.sourceEvent.preventDefault();
          
          // Change cursor to grabbing
          d3.select(event.sourceEvent.target).style("cursor", "grabbing");
          
          // Create a custom drag indicator
          const dragIndicator = g.append("circle")
            .attr("class", "drag-indicator")
            .attr("cx", d.x)
            .attr("cy", d.y)
            .attr("r", 8)
            .attr("fill", "#6A82FB")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .attr("opacity", 0.8)
            .style("pointer-events", "none");
          
          // Store drag data for the drop handling
          event.sourceEvent.dragData = {
            trackId: d.id,
            trackData: d,
            dragIndicator: dragIndicator
          };
        })
        .on("drag", (event, d) => {
          // Prevent event bubbling
          event.sourceEvent.stopPropagation();
          event.sourceEvent.preventDefault();
          
          // Update drag indicator position
          if (event.sourceEvent.dragData?.dragIndicator) {
            event.sourceEvent.dragData.dragIndicator
              .attr("cx", event.x)
              .attr("cy", event.y);
          }
          
          // Check if we're over a valid drop target and provide visual feedback
          const dropTarget = document.elementFromPoint(event.sourceEvent.clientX, event.sourceEvent.clientY);
          const menuItem = dropTarget?.closest('.MenuItemInstanceWrapper.DragTarget');
          
          // Remove previous hover states
          document.querySelectorAll('.MenuItemInstanceWrapper.DragTarget').forEach(item => {
            item.classList.remove('drag-over');
          });
          
          // Add hover state to current target
          if (menuItem) {
            menuItem.classList.add('drag-over');
          }
        })
        .on("end", (event, d) => {
          // Prevent event bubbling
          event.sourceEvent.stopPropagation();
          event.sourceEvent.preventDefault();
          
          // Reset cursor
          d3.select(event.sourceEvent.target).style("cursor", "grab");
          
          // Remove drag indicator
          if (event.sourceEvent.dragData?.dragIndicator) {
            event.sourceEvent.dragData.dragIndicator.remove();
          }
          
          // Remove all drag-over states
          document.querySelectorAll('.MenuItemInstanceWrapper.DragTarget').forEach(item => {
            item.classList.remove('drag-over');
          });
          
          // Check if we're over a valid drop target
          const dropTarget = document.elementFromPoint(event.sourceEvent.clientX, event.sourceEvent.clientY);
          if (dropTarget) {
            // Find the closest MenuItemInstanceWrapper
            const menuItem = dropTarget.closest('.MenuItemInstanceWrapper.DragTarget');
            if (menuItem) {
              // Trigger custom drop event
              const customDropEvent = new CustomEvent('trackDrop', {
                detail: {
                  trackId: d.id,
                  trackData: d
                }
              });
              menuItem.dispatchEvent(customDropEvent);
            }
          }
        })
      );

    // Merge enter and update selections
    const dotsUpdate = dots.merge(dotsEnter);

    // Update colors immediately (no transition for color changes)
    dotsUpdate
      .attr("fill", (d, i) => {
        const color = trackColors[i]?.color || '#AAAAAA';
        return color;
      });

    // Update positions and radius with smooth transitions
    dotsUpdate
      .transition()
      .duration(300)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 4 / lastZoomStateRef.current.k);

    // Store updated dots selection
    d3ContainerRef.current.dots = dotsUpdate;

  }, [plotData, trackColors, onTrackHover, onTrackOut, onTrackClick]);

  const resetZoom = useCallback(() => {
    if (d3ContainerRef.current?.svg && zoomBehaviorRef.current) {
      lastZoomStateRef.current = { k: 1, x: 0, y: 0 };
      d3ContainerRef.current.svg
        .transition()
        .duration(1000)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  return {
    resetZoom,
    d3Container: d3ContainerRef.current
  };
}; 