# Viewport-Based Waveform Loading & Caching

## Overview

This implementation optimizes waveform loading in the track list by only loading waveforms that are currently visible (or about to be visible) in the viewport. This significantly improves performance when dealing with large track libraries.

## Key Features

### 1. Viewport Detection
- Uses `IntersectionObserver` API to detect when waveform components enter/leave the viewport
- Custom `useInViewport` hook provides reusable viewport detection logic
- Configurable `rootMargin` (100px) starts loading before the component becomes visible
- Configurable `threshold` (0.1) triggers when 10% of the component is visible

### 2. Lazy Loading
- Waveforms only initialize when they enter the viewport
- Shows "Scroll to load" placeholder for non-visible waveforms
- Debounced initialization (100ms) prevents rapid firing during fast scrolling
- Automatic cleanup when waveforms leave the viewport

### 3. Caching System
- Waveforms are cached in the `waveforms/` directory as JSON files
- Cache check happens before loading to provide faster subsequent loads
- Two loading states:
  - "Loading..." for cached waveforms (fast)
  - "Generating..." for new waveforms (slower, audio processing required)

### 4. Performance Optimizations
- Automatic cleanup of WaveSurfer instances when leaving viewport
- Timeout-based debouncing prevents resource waste during fast scrolling
- Memory-efficient: only keeps visible waveforms in memory
- Network-efficient: only downloads audio for visible tracks

## Files Modified

### `/src/hooks/useInViewport.js`
Custom React hook for viewport detection:
- Encapsulates IntersectionObserver logic
- Configurable options (rootMargin, threshold, etc.)
- Automatic cleanup and memory management
- Optional `freezeOnceVisible` for one-time loading

### `/src/components/WaveformPreview.jsx`
Enhanced waveform component:
- Integrates viewport detection with waveform loading
- Debounced initialization and cleanup
- Visual loading states for different scenarios
- Maintains sync with main player when visible

### `/src/components/WaveformPreview.scss`
Updated styles:
- Subtle visual indicators for loading states
- Different styling for "scroll to load" vs active loading
- Maintains component height even when not loaded

### `/main.js` (Express routes)
Server-side caching support:
- `GET /waveforms/:id` - Retrieve cached waveform data
- `POST /waveforms/:id` - Save waveform data to cache
- File-based caching in `waveforms/` directory

### `/src/utils/waveformCache.js`
Caching utilities:
- `isWaveformCached(trackId)` - Check if waveform exists in cache
- `getCachedWaveform(trackId)` - Retrieve cached waveform data
- `cacheWaveform(trackId, data)` - Save waveform data to cache

## User Experience

### Before Optimization
- All waveforms loaded simultaneously when track list rendered
- Caused browser freezing with large libraries (100+ tracks)
- High memory usage and network requests
- Slow initial page load

### After Optimization
- Only visible waveforms load (typically 5-10 at a time)
- Smooth scrolling with progressive loading
- Cached waveforms load instantly on subsequent views
- Fast initial page load regardless of library size

## Visual Indicators

1. **"Scroll to load"** - Dotted border, low opacity, shown for non-visible waveforms
2. **"Loading..."** - Solid border, normal opacity, for cached waveforms being loaded
3. **"Generating..."** - Solid border, normal opacity, for new waveforms being processed
4. **Ready** - No overlay, waveform fully interactive

## Configuration

The viewport detection can be customized in `WaveformPreview.jsx`:

```javascript
const [containerRef, isInViewport] = useInViewport({
  rootMargin: '100px', // Start loading 100px before entering viewport
  threshold: 0.1       // Trigger when 10% visible
});
```

Debounce timing can be adjusted:
```javascript
initTimeoutRef.current = setTimeout(() => {
  // ... initialization
}, 100); // 100ms debounce
```

## Memory Management

- WaveSurfer instances are destroyed when leaving viewport
- Timeouts are cleared on component unmount
- IntersectionObserver instances are properly disconnected
- No memory leaks even with rapid scrolling

This optimization makes the application highly scalable for large music libraries while maintaining smooth user interactions. 