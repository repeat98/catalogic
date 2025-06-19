import React from 'react';
import { VISUALIZATION_MODES, HIGHLIGHT_COLOR, LASSO_COLOR } from '../utils/constants.js';

const Controls = ({
  visualizationMode,
  onVisualizationModeChange,
  isLassoMode,
  onLassoToggle,
  isShiftPressed,
  searchQuery,
  onSearchChange,
  searchSuggestions,
  onSuggestionClick,
  showSuggestions,
  selectedSuggestionIndex,
  onKeyDown,
  filterLogicMode,
  onToggleFilterLogicMode,
  highlightThreshold,
  onHighlightThresholdChange,
  activeTab
}) => {
  return (
    <div className="controls-container" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="search-controls" style={{ position: 'absolute', top: 0, right: 0, marginBottom: 10 }}>
        <div className="search-input-container" style={{ position: 'relative', width: '400px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={onSearchChange}
            onKeyDown={onKeyDown}
            placeholder="Search by title, filename, artist, album, genre, or key..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #4a4a4a',
              backgroundColor: '#2a2a2a',
              color: '#e0e0e0',
              fontSize: '14px'
            }}
          />
          {showSuggestions && searchSuggestions.length > 0 && (
            <div 
              className="search-suggestions"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#2a2a2a',
                border: '1px solid #4a4a4a',
                borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000
              }}
            >
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion}
                  onClick={() => onSuggestionClick(suggestion)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: index === selectedSuggestionIndex ? '#4a4a4a' : 'transparent',
                    color: '#e0e0e0',
                    borderBottom: index < searchSuggestions.length - 1 ? '1px solid #4a4a4a' : 'none'
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="visualization-mode-toggle" 
           style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <button
          style={{
            backgroundColor: visualizationMode === VISUALIZATION_MODES.SIMILARITY ? HIGHLIGHT_COLOR : '#232323',
            color: visualizationMode === VISUALIZATION_MODES.SIMILARITY ? '#fff' : '#b0b0b0',
            border: `1.5px solid ${HIGHLIGHT_COLOR}`,
            borderRadius: 6,
            padding: '4px 14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1em',
          }}
          onClick={() => onVisualizationModeChange(VISUALIZATION_MODES.SIMILARITY)}
        >
          Similarity
        </button>
        <button
          style={{
            backgroundColor: visualizationMode === VISUALIZATION_MODES.XY ? HIGHLIGHT_COLOR : '#232323',
            color: visualizationMode === VISUALIZATION_MODES.XY ? '#fff' : '#b0b0b0',
            border: `1.5px solid ${HIGHLIGHT_COLOR}`,
            borderRadius: 6,
            padding: '4px 14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1em',
          }}
          onClick={() => onVisualizationModeChange(VISUALIZATION_MODES.XY)}
        >
          X/Y
        </button>
        <button
          style={{
            backgroundColor: isLassoMode ? LASSO_COLOR : '#232323',
            color: isLassoMode ? '#fff' : '#b0b0b0',
            border: `1.5px solid ${LASSO_COLOR}`,
            borderRadius: 6,
            padding: '4px 14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1em',
          }}
          onClick={onLassoToggle}
        >
          Lasso Select {isShiftPressed ? '(Active)' : '(Shift + Drag)'}
        </button>
      </div>

      {activeTab === 'Map' && (
        <div className="FilterPanelActions" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <button 
            onClick={onToggleFilterLogicMode} 
            className="FilterLogicButton"
            style={{
              backgroundColor: '#232323',
              color: '#b0b0b0',
              border: '1px solid #4a4a4a',
              borderRadius: 4,
              padding: '6px 12px',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.9em',
            }}
          >
            Match: {filterLogicMode === 'intersection' ? 'All Categories (AND)' : 'Any Tag (OR)'}
          </button>
          <div className="confidence-slider" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label 
              htmlFor="highlightThreshold" 
              style={{ 
                minWidth: 110, 
                display: 'inline-block',
                color: '#e0e0e0',
                fontSize: '0.9em'
              }}
            >
              Confidence: {highlightThreshold.toFixed(2)}
            </label>
            <input
              id="highlightThreshold"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={highlightThreshold}
              onChange={e => onHighlightThresholdChange(Number(e.target.value))}
              className="confidence-input"
              style={{
                width: '120px'
              }}
            />
          </div>
        </div>
      )}


    </div>
  );
};

export default Controls; 