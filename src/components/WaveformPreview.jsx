import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useInViewport } from '../hooks/useInViewport';
import { PlaybackContext } from '../context/PlaybackContext';
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
  const { setPlayingWaveSurfer, currentTrack } = useContext(PlaybackContext);
  
  const [containerRef, isInViewport] = useInViewport({
    rootMargin: '100px',
    threshold: 0.1
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const isThisPreviewTheCurrentTrack = currentTrack && currentTrack.id === trackId;

  const initializeWaveform = useCallback(async () => {
    if (!waveformRef.current || isDestroyedRef.current || !trackId || wavesurferRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsReady(false);
    
    try {
      const audioUrl = `http://localhost:3000/audio/${trackId}`;
      
      const response = await fetch(audioUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Audio file not found: ${response.status} ${response.statusText}`);
      }

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
        pixelRatio: 1,
        backend: 'MediaElement',
        mediaType: 'audio',
        autoScroll: false,
      });

      wavesurferRef.current = wavesurfer;

      wavesurfer.on('click', (relativePos) => {
        if (isThisPreviewTheCurrentTrack) {
          if (onSeek) {
            const duration = wavesurfer.getDuration();
            if (duration > 0) {
              const newTime = relativePos * duration;
              onSeek(newTime);
            }
          }
        } else {
          if (onPlayClick) {
            onPlayClick();
          }
        }
      });
      
      wavesurfer.on('dblclick', () => {
        if (onPlayClick) {
          onPlayClick();
        }
      });

      wavesurfer.on('error', (err) => {
        console.error('WaveSurfer error for track', trackId, ':', err);
        setError('Error loading audio');
        setIsLoading(false);
        setIsReady(false);
      });

      wavesurfer.on('ready', () => {
        setIsLoading(false);
        setIsReady(true);
        try {
          wavesurfer.setVolume(0);
        } catch (e) { console.warn('Error setting initial volume to 0 for track', trackId, e); }
        wavesurfer.pause();
      });
      
      await wavesurfer.load(audioUrl);

    } catch (err) {
      console.error('Error initializing waveform for track:', trackId, err);
      setError('Error initializing waveform');
      setIsLoading(false);
      setIsReady(false);
    }
  }, [trackId, height, waveColor, progressColor, onSeek, onPlayClick, isThisPreviewTheCurrentTrack]);

  const cleanupWaveform = useCallback(() => {
    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying wavesurfer:', error);
      }
      wavesurferRef.current = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    if (isInViewport) {
      initTimeoutRef.current = setTimeout(() => {
        if (isInViewport && !isDestroyedRef.current) initializeWaveform();
      }, 100);
    } else {
      cleanupWaveform();
    }
    return () => clearTimeout(initTimeoutRef.current);
  }, [isInViewport, initializeWaveform, cleanupWaveform]);

  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      cleanupWaveform();
    };
  }, [cleanupWaveform]);

  useEffect(() => {
    if (isThisPreviewTheCurrentTrack && isReady && wavesurferRef.current) {
      setPlayingWaveSurfer(wavesurferRef.current);
      try {
        wavesurferRef.current.setVolume(1);
      } catch (e) { console.warn('Error setting volume to 1 for track', trackId, e); }
    } else if (wavesurferRef.current && isReady) {
      try {
        wavesurferRef.current.setVolume(0);
        if (wavesurferRef.current.isPlaying()) {
          wavesurferRef.current.pause();
        }
      } catch (e) { console.warn('Error muting/pausing non-current track', trackId, e); }
    }
  }, [isThisPreviewTheCurrentTrack, isReady, setPlayingWaveSurfer, trackId]);

  useEffect(() => {
    if (wavesurferRef.current && isReady && currentTime !== undefined) {
      const duration = wavesurferRef.current.getDuration();
      if (duration > 0) {
        const currentWaveTime = wavesurferRef.current.getCurrentTime();
        const timeDifference = Math.abs(currentWaveTime - currentTime);

        if (timeDifference > 0.2) {
          if (isThisPreviewTheCurrentTrack && isPlaying) {
          } else {
            const seekPosition = Math.min(1, Math.max(0, currentTime / duration));
            wavesurferRef.current.seekTo(seekPosition);
          }
        }
      }
    }
  }, [currentTime, isReady, trackId, isThisPreviewTheCurrentTrack, isPlaying]);

  return (
    <div ref={containerRef} className="WaveformPreview">
      <div ref={waveformRef} className="WaveformContainer" />
      {!isInViewport && (
        <div className="WaveformOverlay scroll-to-load">
          <div className="WaveformLoading">Scroll to load</div>
        </div>
      )}
      {isInViewport && (isLoading || error) && (
        <div className="WaveformOverlay">
          {isLoading ? <div className="WaveformLoading">Loading...</div> : 
           error ? <div className="WaveformLoading">{error}</div> : null}
        </div>
      )}
    </div>
  );
};

export default WaveformPreview; 