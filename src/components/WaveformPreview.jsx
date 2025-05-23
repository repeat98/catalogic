import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { isWaveformCached, getCachedWaveform, cacheWaveform } from '../utils/waveformCache';
import { useInViewport } from '../hooks/useInViewport';
import './WaveformPreview.scss';

const WaveformPreview = ({ 
  trackId,
  isPlaying, 
  currentTime, 
  onSeek,
  onPlayClick,
  height = 30,
  waveColor = '#4a4a4a',
  progressColor = '#666666'
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const isDestroyedRef = useRef(false);
  const initTimeoutRef = useRef(null);
  
  const [containerRef, isInViewport] = useInViewport({
    rootMargin: '100px', // Start loading 100px before entering viewport
    threshold: 0.1
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Debounced initialization to prevent rapid fire when scrolling
  const initializeWaveform = useCallback(async () => {
    if (!waveformRef.current || isDestroyedRef.current || !trackId) {
      return;
    }

    // Don't reinitialize if already initialized
    if (wavesurferRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing waveform for track:', trackId);
      
      // Check if waveform is cached
      const isCached = await isWaveformCached(trackId);
      console.log('Waveform cached for track', trackId, ':', isCached);
      
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        height,
        waveColor,
        progressColor,
        cursorWidth: 1,
        cursorColor: '#666666',
        barWidth: 1,
        barGap: 1,
        responsive: true,
        normalize: true,
        interact: true,
        hideScrollbar: true,
        fillParent: true,
        minPxPerSec: 1,
        pixelRatio: 1
      });

      wavesurferRef.current = wavesurfer;

      // Add click handler for seeking
      wavesurfer.on('click', (relativePos) => {
        if (onSeek) {
          const duration = wavesurfer.getDuration();
          const newTime = relativePos * duration;
          onSeek(newTime);
        }
      });

      // Add double-click handler for play/pause
      wavesurfer.on('dblclick', () => {
        if (onPlayClick) {
          onPlayClick();
        }
      });

      // Set up event listeners
      wavesurfer.on('error', (err) => {
        console.error('WaveSurfer error for track', trackId, ':', err);
        setError('Error loading audio');
        setIsLoading(false);
        setIsGenerating(false);
      });

      wavesurfer.on('ready', () => {
        console.log('WaveSurfer ready for track', trackId);
        setIsLoading(false);
        setIsGenerating(false);
      });

      if (isCached) {
        // Load from cache
        console.log('Loading cached waveform for track', trackId);
        const cachedData = await getCachedWaveform(trackId);
        console.log('Retrieved cached data for track', trackId, ':', cachedData);
        
        if (cachedData && Array.isArray(cachedData.peaks) && cachedData.peaks.length > 0) {
          console.log('Using cached waveform data for track', trackId, 'Size:', cachedData.peaks.length);
          try {
            // Load audio with cached peaks
            const audioUrl = `http://localhost:3000/audio/${trackId}`;
            wavesurfer.load(audioUrl, cachedData.peaks);
            setIsLoading(false);
            console.log('Cached waveform loaded successfully for track', trackId);
          } catch (bufferError) {
            console.warn('Error loading from cached peaks for track', trackId, ':', bufferError);
            // Fallback to loading audio file without peaks
            setIsGenerating(true);
            const audioUrl = `http://localhost:3000/audio/${trackId}`;
            wavesurfer.load(audioUrl);
          }
        } else {
          console.log('Cache data invalid or empty for track', trackId, 'Data:', cachedData);
          setIsGenerating(true);
          const audioUrl = `http://localhost:3000/audio/${trackId}`;
          wavesurfer.load(audioUrl);
        }
      } else {
        // Load audio and generate waveform
        console.log('Generating new waveform for track', trackId);
        setIsGenerating(true);
        const audioUrl = `http://localhost:3000/audio/${trackId}`;
        
        // Set up waveform-ready listener to cache the data
        wavesurfer.on('ready', async () => {
          try {
            // Generate peaks with 1024 points (matching Waveform.jsx)
            const peaksArray = wavesurfer.exportPeaks(1024);
            const waveformData = { peaks: peaksArray };
            console.log('Caching waveform data for track', trackId, 'Size:', peaksArray.length);
            const cacheSuccess = await cacheWaveform(trackId, waveformData);
            if (cacheSuccess) {
              console.log('Waveform cached successfully for track', trackId);
            } else {
              console.error('Failed to cache waveform for track', trackId);
            }
          } catch (cacheError) {
            console.error('Error caching waveform for track', trackId, ':', cacheError);
          }
        });

        wavesurfer.load(audioUrl);
      }

    } catch (error) {
      console.error('Error initializing waveform:', error);
      setError('Error initializing waveform');
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [trackId, height, waveColor, progressColor, onSeek, onPlayClick]);

  // Cleanup waveform when leaving viewport
  const cleanupWaveform = useCallback(() => {
    if (wavesurferRef.current) {
      try {
        console.log('Cleaning up waveform for track:', trackId);
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        setIsLoading(false);
        setIsGenerating(false);
        setError(null);
      } catch (error) {
        console.warn('Error destroying wavesurfer on viewport exit:', error);
      }
    }
  }, [trackId]);

  // Handle viewport changes with debouncing
  useEffect(() => {
    // Clear any pending initialization
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    if (isInViewport) {
      // Debounce initialization to prevent rapid fire
      initTimeoutRef.current = setTimeout(() => {
        if (isInViewport && !isDestroyedRef.current) {
          initializeWaveform();
        }
      }, 100);
    } else {
      // Clean up immediately when leaving viewport
      cleanupWaveform();
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isInViewport, initializeWaveform, cleanupWaveform]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying wavesurfer:', error);
        }
        wavesurferRef.current = null;
      }
    };
  }, []);

  // Sync with main player's play/pause state
  useEffect(() => {
    if (!wavesurferRef.current || isDestroyedRef.current) return;

    try {
      if (isPlaying) {
        if (wavesurferRef.current.isReady()) {
          wavesurferRef.current.play();
        }
      } else {
        wavesurferRef.current.pause();
      }
    } catch (error) {
      console.warn('Error controlling wavesurfer playback:', error);
    }
  }, [isPlaying]);

  // Sync with main player's current time
  useEffect(() => {
    if (!wavesurferRef.current || !currentTime || isDestroyedRef.current) return;
    
    try {
      if (wavesurferRef.current.isReady()) {
        const currentWaveTime = wavesurferRef.current.getCurrentTime();
        if (Math.abs(currentWaveTime - currentTime) > 0.5) {
          wavesurferRef.current.seekTo(currentTime / wavesurferRef.current.getDuration());
        }
      }
    } catch (error) {
      console.warn('Error syncing wavesurfer time:', error);
    }
  }, [currentTime]);

  return (
    <div ref={containerRef} className="WaveformPreview">
      <div ref={waveformRef} className="WaveformContainer" />
      {!isInViewport && (
        <div className="WaveformOverlay scroll-to-load">
          <div className="WaveformLoading">Scroll to load</div>
        </div>
      )}
      {isInViewport && (isLoading || isGenerating || error) && (
        <div className="WaveformOverlay">
          {isLoading ? (
            <div className="WaveformLoading">Loading...</div>
          ) : isGenerating ? (
            <div className="WaveformLoading">Generating...</div>
          ) : error ? (
            <div className="WaveformLoading">{error}</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default WaveformPreview; 