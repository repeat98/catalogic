import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import Tracklist from './Tracklist';
import './Content.scss';

const Content = () => {
  const [allTracks, setAllTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Audio Player State & Ref ---
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null); // Ref for the audio element
  const [audioError, setAudioError] = useState('');


  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:3000/tracks');
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorBody = await response.json(); // Try to get more info from body
            errorMessage += ` - ${errorBody.error || response.statusText}`;
          } catch (e) {
            errorMessage += ` - ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        const data = await response.json();

        const processedTracks = data.map(track => {
          let artworkPath = 'assets/default-artwork.png'; // Updated default path

          if (track.artwork_thumbnail_path) {
            // Assuming artwork_thumbnail_path might be a direct URL or resolvable path
            // If it's a local file system path, it needs special handling in Electron as discussed
            artworkPath = track.artwork_thumbnail_path;
          }
          return {
            ...track,
            artwork_thumbnail_path: artworkPath,
          };
        });
        setAllTracks(processedTracks);
      } catch (e) {
        console.error("Failed to fetch tracks:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, []);

  const handleTrackSelect = (trackId) => {
    setSelectedTrackId(trackId);
  };

  const handlePlayTrack = (track) => {
    if (!track || !track.id) {
      console.error("Invalid track object passed to handlePlayTrack:", track);
      return;
    }
    setAudioError(''); // Clear previous audio errors
    const audioUrl = `http://localhost:3000/audio/${track.id}`;
    
    if (currentPlayingTrack && currentPlayingTrack.id === track.id && audioPlayerRef.current) {
      // If it's the same track, toggle play/pause
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play().catch(e => {
            console.error("Error playing audio:", e);
            setAudioError(`Cannot play: ${track.title}. ${e.message}`);
            setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    } else {
      // New track or no track was playing
      setCurrentPlayingTrack(track);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.load(); // Important to load new source
        audioPlayerRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(e => {
            console.error("Error playing audio:", e);
            setAudioError(`Cannot play: ${track.title}. ${e.message}`);
            setIsPlaying(false);
        });
      }
    }
  };
  
    // Audio element event handlers
    useEffect(() => {
        const audioEl = audioPlayerRef.current;
        if (!audioEl) return;

        const handleAudioPlay = () => setIsPlaying(true);
        const handleAudioPause = () => setIsPlaying(false);
        const handleAudioEnded = () => {
            setIsPlaying(false);
            // Optional: play next track
            // const currentIndex = allTracks.findIndex(t => t.id === currentPlayingTrack?.id);
            // if (currentIndex !== -1 && currentIndex < allTracks.length - 1) {
            //   handlePlayTrack(allTracks[currentIndex + 1]);
            // } else {
            //   setCurrentPlayingTrack(null);
            // }
        };
        const handleAudioError = (e) => {
            console.error("Audio Element Error:", e);
            setAudioError(`Error with audio: ${currentPlayingTrack?.title || 'current track'}.`);
            setIsPlaying(false);
        };

        audioEl.addEventListener('play', handleAudioPlay);
        audioEl.addEventListener('pause', handleAudioPause);
        audioEl.addEventListener('ended', handleAudioEnded);
        audioEl.addEventListener('error', handleAudioError);

        return () => {
            audioEl.removeEventListener('play', handleAudioPlay);
            audioEl.removeEventListener('pause', handleAudioPause);
            audioEl.removeEventListener('ended', handleAudioEnded);
            audioEl.removeEventListener('error', handleAudioError);
        };
    }, [audioPlayerRef, currentPlayingTrack?.id, allTracks]);


  if (isLoading) {
    return <div className="ContentLoading">Loading tracks...</div>;
  }

  if (error) {
    return <div className="ContentError">Error loading tracks: {error}. Make sure the backend server is running.</div>;
  }

  return (
    <div data-layer="content" className="Content">
      <Tracklist
        tracks={allTracks}
        selectedTrackId={selectedTrackId}
        onTrackSelect={handleTrackSelect}
        onPlayTrack={handlePlayTrack} // Pass the refined handler
        currentPlayingTrackId={currentPlayingTrack?.id}
        isAudioPlaying={isPlaying}
      />
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />
      {(currentPlayingTrack || audioError) && (
        <div className="MiniPlayerInfo">
          {audioError ? (
            <span className="AudioErrorText">{audioError}</span>
          ) : currentPlayingTrack ? (
            <>
              Now {isPlaying ? 'Playing' : 'Paused'}: {currentPlayingTrack.title} - {currentPlayingTrack.artist}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Content;