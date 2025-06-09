import React, { useState, useEffect, useMemo } from 'react';
import WaveformPreview from './WaveformPreview';
import './RecommendationPanel.scss';

const RecommendationPanel = ({
  currentTracks,
  allTracks,
  onAcceptRecommendation,
  onRejectRecommendation,
  onPlayTrack,
  currentPlayingTrack,
  isPlaying,
  onSeek,
  currentTime
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectedTrackIds, setRejectedTrackIds] = useState([]);

  const calculateSimilarityScores = useMemo(() => {
    console.log('Calculating recommendations with:', {
      currentTracksCount: currentTracks?.length,
      allTracksCount: allTracks?.length
    });

    if (!currentTracks?.length || !allTracks?.length) {
      console.log('No tracks available for recommendations');
      return [];
    }

    // 1. Calculate the average profile of tracks in the current tag
    const tagTracks = allTracks.filter(track => currentTracks.includes(track.id));
    console.log('Tag tracks found:', tagTracks.length);

    if (!tagTracks.length) {
      console.log('No tracks found in current tag');
      return [];
    }

    const averageProfile = {
      style_features: {},
    };

    const styleKeys = new Set();
    tagTracks.forEach(track => {
      if (track.style_features) {
        Object.keys(track.style_features).forEach(k => styleKeys.add(k));
      }
    });

    console.log('Style keys found:', Array.from(styleKeys));

    if (styleKeys.size === 0) {
      console.log('No style features found in tag tracks');
      return [];
    }

    styleKeys.forEach(k => averageProfile.style_features[k] = 0);

    tagTracks.forEach(track => {
      styleKeys.forEach(k => {
        averageProfile.style_features[k] += (track.style_features?.[k] || 0);
      });
    });

    const numTagTracks = tagTracks.length;
    styleKeys.forEach(k => {
      averageProfile.style_features[k] /= numTagTracks;
    });

    console.log('Average profile calculated:', averageProfile);

    // 2. Score candidate tracks against the average profile
    const candidateTracks = allTracks.filter(track => !currentTracks.includes(track.id));
    console.log('Candidate tracks found:', candidateTracks.length);

    if (candidateTracks.length === 0) {
      console.log('No candidate tracks available');
      return [];
    }

    let scoredTracks = candidateTracks.map(track => {
      let totalStyleDifference = 0;
      
      styleKeys.forEach(k => {
        const candidateScore = track.style_features?.[k] || 0;
        const averageScore = averageProfile.style_features[k];
        totalStyleDifference += Math.abs(candidateScore - averageScore);
      });

      const avgStyleDifference = totalStyleDifference / styleKeys.size;
      
      return {
        track,
        styleDifference: avgStyleDifference,
      };
    });

    // 3. Normalize scores
    const maxStyleDiff = Math.max(...scoredTracks.map(item => item.styleDifference));
    console.log('Max style difference:', maxStyleDiff);

    if (maxStyleDiff > 0) {
      scoredTracks = scoredTracks.map(item => {
        const styleScore = 1 - (item.styleDifference / maxStyleDiff);
        return {
          ...item.track,
          similarityScore: styleScore
        };
      });
    } else {
      scoredTracks = scoredTracks.map(item => ({...item.track, similarityScore: 1}));
    }

    // 4. Sort by similarity score and return top 10
    const finalRecommendations = scoredTracks
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 10);

    console.log('Final recommendations count:', finalRecommendations.length);
    return finalRecommendations;
  }, [currentTracks, allTracks]);

  useEffect(() => {
    setIsLoading(true);
    const newRecommendations = calculateSimilarityScores;
    console.log('Setting new recommendations:', newRecommendations.length);
    setRecommendations(newRecommendations);
    setIsLoading(false);
  }, [calculateSimilarityScores]);

  // Handler for rejecting a recommendation
  const handleRejectRecommendation = (trackId) => {
    setRejectedTrackIds(prev => [...prev, trackId]);
    if (onRejectRecommendation) onRejectRecommendation(trackId);
  };

  if (isLoading) {
    return <div className="RecommendationPanelLoading">Calculating recommendations...</div>;
  }

  if (!currentTracks?.length) {
    return <div className="RecommendationPanelEmpty">Add some tracks to get recommendations</div>;
  }

  return (
    <div className="RecommendationPanel">
      <h3>Recommended Tracks</h3>
      <div className="RecommendationsList">
        {recommendations.filter(track => !rejectedTrackIds.includes(track.id)).length > 0 ? (
          recommendations.filter(track => !rejectedTrackIds.includes(track.id)).map(track => (
            <div key={track.id} className="RecommendationItem">
              <div className="TrackDetails">
                <div className="TrackInfo">
                  <div className="TrackTitle">{track.title}</div>
                  <div className="TrackArtist">{track.artist}</div>
                </div>
                <div className="SimilarityScore">
                  {Math.round(track.similarityScore * 100)}%
                </div>
                <div className="WaveformContainer">
                  <WaveformPreview
                    trackId={track.id}
                    isPlaying={currentPlayingTrack?.id === track.id && isPlaying}
                    currentTime={currentPlayingTrack?.id === track.id ? currentTime : 0}
                    onSeek={onSeek}
                    onPlayClick={() => onPlayTrack(track)}
                  />
                </div>
              </div>
              <div className="TrackActions">
                <button
                  className="PreviewButton"
                  onClick={() => onPlayTrack(track)}
                  title="Preview track"
                >
                  {currentPlayingTrack?.id === track.id && isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  className="AcceptButton"
                  onClick={() => onAcceptRecommendation(track.id)}
                  title="Add to tag"
                >
                  ✓
                </button>
                <button
                  className="RejectButton"
                  onClick={() => handleRejectRecommendation(track.id)}
                  title="Dismiss recommendation"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="RecommendationPanelEmpty">No suitable recommendations found.</div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPanel; 