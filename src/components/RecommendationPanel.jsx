import React, { useState, useEffect } from 'react';
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

  // Calculate similarity scores for all tracks
  const calculateSimilarityScores = () => {
    if (!currentTracks.length || !allTracks.length) return [];

    // Get all tracks that are not in the current tag
    const candidateTracks = allTracks.filter(track => !currentTracks.includes(track.id));

    // Calculate similarity scores for each candidate track
    const scoredTracks = candidateTracks.map(track => {
      let totalScore = 0;
      let featureCount = 0;

      // Compare with each track in the current tag
      currentTracks.forEach(currentTrackId => {
        const currentTrack = allTracks.find(t => t.id === currentTrackId);
        if (!currentTrack) return;

        // Compare genre scores
        if (track.genre_scores && currentTrack.genre_scores) {
          Object.keys(track.genre_scores).forEach(genre => {
            if (currentTrack.genre_scores[genre]) {
              const score = 1 - Math.abs(track.genre_scores[genre] - currentTrack.genre_scores[genre]);
              totalScore += score;
              featureCount++;
            }
          });
        }

        // Compare style scores
        if (track.style_scores && currentTrack.style_scores) {
          Object.keys(track.style_scores).forEach(style => {
            if (currentTrack.style_scores[style]) {
              const score = 1 - Math.abs(track.style_scores[style] - currentTrack.style_scores[style]);
              totalScore += score;
              featureCount++;
            }
          });
        }

        // Compare mood scores
        if (track.mood_scores && currentTrack.mood_scores) {
          Object.keys(track.mood_scores).forEach(mood => {
            if (currentTrack.mood_scores[mood]) {
              const score = 1 - Math.abs(track.mood_scores[mood] - currentTrack.mood_scores[mood]);
              totalScore += score;
              featureCount++;
            }
          });
        }

        // Compare spectral features
        const spectralFeatures = ['atonal', 'tonal', 'dark', 'bright', 'percussive', 'smooth'];
        spectralFeatures.forEach(feature => {
          if (track[feature] !== undefined && currentTrack[feature] !== undefined) {
            const score = 1 - Math.abs(track[feature] - currentTrack[feature]);
            totalScore += score;
            featureCount++;
          }
        });
      });

      // Calculate average score
      const averageScore = featureCount > 0 ? totalScore / featureCount : 0;

      return {
        ...track,
        similarityScore: averageScore
      };
    });

    // Sort by similarity score and return top 10
    return scoredTracks
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 10);
  };

  useEffect(() => {
    setIsLoading(true);
    const newRecommendations = calculateSimilarityScores();
    setRecommendations(newRecommendations);
    setIsLoading(false);
  }, [currentTracks, allTracks]);

  if (isLoading) {
    return <div className="RecommendationPanelLoading">Calculating recommendations...</div>;
  }

  if (!currentTracks.length) {
    return <div className="RecommendationPanelEmpty">Add some tracks to get recommendations</div>;
  }

  return (
    <div className="RecommendationPanel">
      <h3>Recommended Tracks</h3>
      <div className="RecommendationsList">
        {recommendations.map(track => (
          <div key={track.id} className="RecommendationItem">
            <div className="TrackDetails">
              <div className="TrackInfo">
                <div className="TrackTitle">{track.title}</div>
                <div className="TrackArtist">{track.artist}</div>
                <div className="SimilarityScore">
                  Similarity: {Math.round(track.similarityScore * 100)}%
                </div>
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
                onClick={() => onRejectRecommendation(track.id)}
                title="Dismiss recommendation"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationPanel; 