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

    // 1. Calculate the average feature vector of tracks in the current tag
    const tagTracks = allTracks.filter(track => currentTracks.includes(track.id));
    console.log('Tag tracks found:', tagTracks.length);

    if (!tagTracks.length) {
      console.log('No tracks found in current tag');
      return [];
    }

    // Get all unique feature keys from all tracks to create a consistent vector space
    const allFeatureKeys = new Set();
    allTracks.forEach(track => {
      if (track.style_features) {
        Object.keys(track.style_features).forEach(key => allFeatureKeys.add(key));
      }
    });

    if (allFeatureKeys.size === 0) {
      console.log('No style features found in any tracks');
      return [];
    }

    const averageVector = {};
    allFeatureKeys.forEach(key => averageVector[key] = 0);

    let tracksWithFeatures = 0;
    tagTracks.forEach(track => {
      if (track.style_features && Object.keys(track.style_features).length > 0) {
        tracksWithFeatures++;
        allFeatureKeys.forEach(key => {
          averageVector[key] += track.style_features[key] || 0;
        });
      }
    });

    if (tracksWithFeatures === 0) {
        console.log('No tracks in tag have style features');
        return [];
    }

    allFeatureKeys.forEach(key => {
      averageVector[key] /= tracksWithFeatures;
    });

    console.log('Average vector calculated');

    // 2. Score candidate tracks against the average vector using cosine similarity
    const candidateTracks = allTracks.filter(track => !currentTracks.includes(track.id));
    console.log('Candidate tracks found:', candidateTracks.length);

    if (candidateTracks.length === 0) {
      console.log('No candidate tracks available');
      return [];
    }
    
    const cosineSimilarity = (vecA, vecB, keys) => {
      let dotProduct = 0;
      let magnitudeA = 0;
      let magnitudeB = 0;

      for (const key of keys) {
        const valA = vecA[key] || 0;
        const valB = vecB[key] || 0;
        dotProduct += valA * valB;
        magnitudeA += valA * valA;
        magnitudeB += valB * valB;
      }
      
      magnitudeA = Math.sqrt(magnitudeA);
      magnitudeB = Math.sqrt(magnitudeB);
  
      if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
      }
  
      return dotProduct / (magnitudeA * magnitudeB);
    };

    let scoredTracks = candidateTracks.map(track => {
      const trackVector = track.style_features || {};
      const similarity = cosineSimilarity(averageVector, trackVector, allFeatureKeys);
      
      return {
        ...track,
        similarityScore: similarity,
      };
    }).filter(t => t.similarityScore > 0.1); // Filter out very dissimilar tracks

    // 3. Sort by similarity score and return top 20
    const finalRecommendations = scoredTracks
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 20);

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