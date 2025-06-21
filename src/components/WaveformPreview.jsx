import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { useInViewport } from '../hooks/useInViewport';
import { PlaybackContext } from '../context/PlaybackContext';
import { getCachedWaveform, cacheWaveform } from '../utils/waveformCache.js';
import './WaveformPreview.scss';

const VERBOSE = typeof window !== 'undefined' && window.__WF_VERBOSE;
const vLog = (...args) => { if (VERBOSE) console.log(...args); };

const WaveformPreview = ({ 
  trackId,
  isPlaying,
  currentTime,
  onSeek,
  onPlayClick,
  onPendingSeek,
  height = 30,
  waveColor = '#7a7a7a',
  progressColor = '#9a9a9a',
  isPlayerWaveform = false  // New prop to identify player waveforms
}) => {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const isDestroyedRef = useRef(false);
  const initTimeoutRef = useRef(null);
  const isInitializingRef = useRef(false);
  const { setPlayingWaveSurfer, currentTrack } = useContext(PlaybackContext);
  
  const [containerRef, isInViewport] = useInViewport({
    rootMargin: '400px', // Reduced from 800px to be more conservative on battery
    threshold: 0.1
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingSeekTime, setPendingSeekTime] = useState(null);
  const [justAppliedSeek, setJustAppliedSeek] = useState(false);

  const isThisPreviewTheCurrentTrack = currentTrack && currentTrack.id === trackId;

  vLog(`[WaveformPreview ${trackId}] Component state:`, {
    isThisPreviewTheCurrentTrack,
    isPlaying,
    currentTime,
    isReady,
    pendingSeekTime,
    justAppliedSeek,
    currentTrack: currentTrack?.id
  });

  const initializeWaveform = useCallback(async () => {
    if (isInitializingRef.current || wavesurferRef.current || isDestroyedRef.current) {
      vLog(`[WaveformPreview ${trackId}] Skipping init - already initializing or initialized`);
      return;
    }

    vLog(`[WaveformPreview ${trackId}] Starting initialization`);
    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);

    if (!waveformRef.current) {
      vLog(`[WaveformPreview ${trackId}] No container ref available`);
      setIsLoading(false);
      isInitializingRef.current = false;
      return;
    }

    try {
      const { default: WaveSurfer } = await import('wavesurfer.js');
      
      if (isDestroyedRef.current) {
        vLog(`[WaveformPreview ${trackId}] Component destroyed during import`);
        return;
      }

      const audioUrl = `http://localhost:3000/audio/${trackId}`;
      const cachedData = await getCachedWaveform(trackId);
      const cachedPeaks = cachedData?.peaks || null;

      vLog(`[WaveformPreview ${trackId}] Creating WaveSurfer instance`, {
        hasCachedPeaks: !!cachedPeaks,
        audioUrl
      });

      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        backend: 'MediaElement',
        mediaControls: false,
        waveColor: waveColor,
        progressColor: progressColor,
        height: height,
        normalize: false,
        pixelRatio: 1,
        interact: true,
        barWidth: 2,
        barGap: 1,
        cursorWidth: 0,
        dragToSeek: false,
      });

      wavesurferRef.current = wavesurfer;
      isInitializingRef.current = false;

      wavesurfer.on('click', (relativePos) => {
        // Only handle clicks if we have handlers (not read-only mode)
        if (!onSeek && !onPlayClick) {
          console.log(`[WaveformPreview ${trackId}] Click ignored - read-only mode`);
          return;
        }
        
        console.log(`[WaveformPreview ${trackId}] Click event:`, {
          relativePos,
          isThisPreviewTheCurrentTrack,
          duration: wavesurfer.getDuration()
        });
        
        if (isThisPreviewTheCurrentTrack) {
          if (onSeek) {
            const duration = wavesurfer.getDuration();
            if (duration > 0) {
              const newTime = relativePos * duration;
              console.log(`[WaveformPreview ${trackId}] Seeking current track to:`, newTime);
              onSeek(newTime);
            }
          }
        } else {
          if (onPlayClick) {
            // Store the intended seek position for when this track becomes current
            const duration = wavesurfer.getDuration();
            if (duration > 0) {
              const seekTime = relativePos * duration;
              console.log(`[WaveformPreview ${trackId}] Setting pending seek:`, seekTime);
              setPendingSeekTime(seekTime);
              
              // Notify parent about the pending seek BEFORE calling onPlayClick
              if (onPendingSeek) {
                console.log(`[WaveformPreview ${trackId}] Calling onPendingSeek:`, seekTime);
                onPendingSeek(seekTime);
              }
            }
            console.log(`[WaveformPreview ${trackId}] Calling onPlayClick`);
            onPlayClick();
          }
        }
      });
      
      wavesurfer.on('dblclick', () => {
        console.log(`[WaveformPreview ${trackId}] Double-click event`);
        if (onPlayClick) {
          // For double-click, we want to start from the beginning
          setPendingSeekTime(0);
          if (onPendingSeek) {
            onPendingSeek(0);
          }
          onPlayClick();
        }
      });

      wavesurfer.on('error', (err) => {
        vLog('WaveSurfer error for track', trackId, ':', err);
        setError('Error loading audio');
        setIsLoading(false);
        setIsReady(false);
      });

      wavesurfer.on('ready', async () => {
        vLog(`[WaveformPreview ${trackId}] WaveSurfer ready`);
        setIsLoading(false);
        setIsReady(true);
        try {
          wavesurfer.setVolume(0);
        } catch (e) { vLog('Error setting initial volume to 0 for track', trackId, e); }
        wavesurfer.pause();

        // If waveform was not loaded from cache, export and cache its peaks
        if (!cachedPeaks && wavesurferRef.current) {
          try {
            const peaks = wavesurferRef.current.exportPeaks();
            if (peaks && peaks.length > 0) {
              await cacheWaveform(trackId, { peaks });
            }
          } catch (e) {
            vLog('Error exporting/caching peaks for track', trackId, e);
          }
        }
      });
      
      if (cachedPeaks) {
        await wavesurfer.load(audioUrl, cachedPeaks);
      } else {
        await wavesurfer.load(audioUrl);
      }

    } catch (err) {
      vLog('Error initializing waveform for track:', trackId, err);
      setError('Error initializing waveform');
      setIsLoading(false);
      setIsReady(false);
    }
  }, [trackId, height, waveColor, progressColor, onSeek, onPlayClick, onPendingSeek]);

  const cleanupWaveform = useCallback(() => {
    vLog(`[WaveformPreview ${trackId}] Cleaning up waveform`);
    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (error) {
        vLog('Error destroying wavesurfer:', error);
      }
      wavesurferRef.current = null;
    }
    setIsReady(false);
  }, [trackId]);

  // Effect to handle trackId changes
  useEffect(() => {
    console.log(`[WaveformPreview] Track ID changed to:`, trackId);
    return () => {
      // Cleanup when trackId changes or component unmounts
      if (wavesurferRef.current) {
        console.log(`[WaveformPreview] Cleaning up waveform for track:`, trackId);
        cleanupWaveform();
      }
    };
  }, [trackId, cleanupWaveform]);

  useEffect(() => {
    if (isInViewport) {
      vLog(`[WaveformPreview ${trackId}] In viewport - initializing`);
      if (isInViewport && !isDestroyedRef.current) initializeWaveform();
    } else {
      vLog(`[WaveformPreview ${trackId}] Out of viewport - cleaning up`);
      cleanupWaveform();
    }
  }, [isInViewport, initializeWaveform, cleanupWaveform]);

  useEffect(() => {
    return () => {
      vLog(`[WaveformPreview ${trackId}] Component unmounting`);
      isDestroyedRef.current = true;
      cleanupWaveform();
    };
  }, [cleanupWaveform, trackId]);

  useEffect(() => {
    vLog(`[WaveformPreview ${trackId}] Volume control effect:`, {
      isThisPreviewTheCurrentTrack,
      isReady,
      hasWaveSurfer: !!wavesurferRef.current,
      hasPlayClick: !!onPlayClick,
      isPlayerWaveform
    });
    
    if (isThisPreviewTheCurrentTrack && isReady && wavesurferRef.current) {
      // Only set as playing wavesurfer if this is an interactive waveform (has onPlayClick) and not the player
      if (onPlayClick && !isPlayerWaveform) {
        console.log(`[WaveformPreview ${trackId}] Setting as playing wavesurfer`);
        setPlayingWaveSurfer(wavesurferRef.current);
        try {
          wavesurferRef.current.setVolume(1);
        } catch (e) { vLog('Error setting volume to 1 for track', trackId, e); }
      } else if (isPlayerWaveform) {
        // This is a display-only waveform (Player), keep it muted but sync play/pause state
        vLog(`[WaveformPreview ${trackId}] Player waveform - syncing play/pause state`);
        try {
          wavesurferRef.current.setVolume(0);
          // Sync the play/pause state with the main playback
          if (isPlaying && !wavesurferRef.current.isPlaying()) {
            wavesurferRef.current.play();
          } else if (!isPlaying && wavesurferRef.current.isPlaying()) {
            wavesurferRef.current.pause();
          }
        } catch (e) { vLog('Error syncing player waveform state', trackId, e); }
      } else {
        // This is a display-only waveform (like in Player), keep it muted
        vLog(`[WaveformPreview ${trackId}] Display-only mode - keeping muted`);
        try {
          wavesurferRef.current.setVolume(0);
        } catch (e) { vLog('Error muting display-only waveform', trackId, e); }
      }
    } else if (wavesurferRef.current && isReady) {
      vLog(`[WaveformPreview ${trackId}] Muting non-current track`);
      try {
        wavesurferRef.current.setVolume(0);
        if (wavesurferRef.current.isPlaying()) {
          wavesurferRef.current.pause();
        }
      } catch (e) { vLog('Error muting/pausing non-current track', trackId, e); }
    }
  }, [isThisPreviewTheCurrentTrack, isReady, setPlayingWaveSurfer, trackId, onPlayClick, isPlayerWaveform, isPlaying]);

  useEffect(() => {
    if (wavesurferRef.current && isReady && currentTime !== undefined && !justAppliedSeek && pendingSeekTime === null) {
      const duration = wavesurferRef.current.getDuration();
      if (duration > 0) {
        const currentWaveTime = wavesurferRef.current.getCurrentTime();
        const timeDifference = Math.abs(currentWaveTime - currentTime);

        if (timeDifference > 0.2) {
          vLog(`[WaveformPreview ${trackId}] Time sync needed:`, {
            currentWaveTime,
            currentTime,
            timeDifference,
            isThisPreviewTheCurrentTrack,
            isPlaying,
            isPlayerWaveform
          });
          
          // For player waveforms, always sync to show progress
          // For TrackCell waveforms, only sync when not actively playing to avoid interrupting user seeks
          if (isPlayerWaveform || (!isThisPreviewTheCurrentTrack || !isPlaying)) {
            const seekPosition = Math.min(1, Math.max(0, currentTime / duration));
            vLog(`[WaveformPreview ${trackId}] Syncing to position:`, seekPosition);
            wavesurferRef.current.seekTo(seekPosition);
          } else {
            vLog(`[WaveformPreview ${trackId}] Skipping sync during playback`);
          }
        }
      }
    }
  }, [currentTime, isReady, trackId, isThisPreviewTheCurrentTrack, isPlaying, justAppliedSeek, pendingSeekTime, isPlayerWaveform]);

  // Effect to apply pending seek when track becomes current
  useEffect(() => {
    console.log(`[WaveformPreview ${trackId}] Pending seek effect:`, {
      isThisPreviewTheCurrentTrack,
      isReady,
      pendingSeekTime,
      hasWaveSurfer: !!wavesurferRef.current
    });
    
    if (isThisPreviewTheCurrentTrack && isReady && wavesurferRef.current && pendingSeekTime !== null) {
      console.log(`[WaveformPreview ${trackId}] Applying pending seek:`, pendingSeekTime);
      
      // Apply the pending seek immediately and synchronously
      try {
        const duration = wavesurferRef.current.getDuration();
        if (duration > 0) {
          const seekPosition = Math.min(1, Math.max(0, pendingSeekTime / duration));
          
          // Set flag to prevent currentTime sync from interfering
          setJustAppliedSeek(true);
          
          // Apply seek immediately
          console.log(`[WaveformPreview ${trackId}] Seeking to position:`, seekPosition);
          wavesurferRef.current.seekTo(seekPosition);
          
          // Start playback if needed - but wait a tick to ensure seek is applied
          setTimeout(() => {
            if (wavesurferRef.current && !wavesurferRef.current.isPlaying()) {
              console.log(`[WaveformPreview ${trackId}] Starting playback after seek`);
              wavesurferRef.current.setVolume(1);
              wavesurferRef.current.play().catch(e => {
                console.warn('Error playing after pending seek:', e);
              });
            }
          }, 50); // Very short delay just to ensure seek is applied
          
          setPendingSeekTime(null); // Clear the pending seek immediately
          
          // Clear the flag after a short delay to allow normal sync to resume
          setTimeout(() => {
            console.log(`[WaveformPreview ${trackId}] Clearing justAppliedSeek flag`);
            setJustAppliedSeek(false);
          }, 300);
        }
      } catch (e) {
        console.warn('Error applying pending seek:', e);
        setPendingSeekTime(null); // Clear on error
        setJustAppliedSeek(false);
      }
    }
  }, [isThisPreviewTheCurrentTrack, isReady, pendingSeekTime, trackId]);

  // Clear pending seek if track changes to a different one
  useEffect(() => {
    if (!isThisPreviewTheCurrentTrack && pendingSeekTime !== null) {
      vLog(`[WaveformPreview ${trackId}] Clearing pending seek - track no longer current`);
      setPendingSeekTime(null);
    }
  }, [isThisPreviewTheCurrentTrack, pendingSeekTime, trackId]);

  return (
    <div ref={containerRef} className="WaveformPreview">
      <div ref={waveformRef} className="WaveformContainer" />
      {/* {!isInViewport && (
        <div className="WaveformOverlay scroll-to-load">
          <div className="WaveformLoading">Scroll to load</div>
        </div>
      )} */}
      {isInViewport && (isLoading || error) && (
        <div className="WaveformOverlay">
          {/* {isLoading ? <div className="WaveformLoading">Loading...</div> :  */}
          {error ? <div className="WaveformLoading">{error}</div> : null}
        </div>
      )}
    </div>
  );
};

export default WaveformPreview; 