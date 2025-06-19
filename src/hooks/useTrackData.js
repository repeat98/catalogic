import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, PADDING } from '../utils/constants.js';
import { 
  getAllFeatureKeysAndCategories, 
  mergeFeatureVectors, 
  normalizeFeatures, 
  pca, 
  hdbscan 
} from '../utils/dataProcessingUtils.js';

export const useTrackData = (svgDimensions, filterOptions = {}) => {
  const [tracks, setTracks] = useState([]);
  const [plotData, setPlotData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featureMetadata, setFeatureMetadata] = useState({ names: [], categories: [] });
  const [featureMinMax, setFeatureMinMax] = useState({});

  // Extract filtering parameters
  const { crates, tags, selectedCrateId, selectedTagId, viewMode } = filterOptions;

  const fetchTracksData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/tracks`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP error! status: ${response.status}` 
        }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      if (!Array.isArray(rawData)) {
        throw new Error("Invalid data: Expected array.");
      }

      // Apply filtering based on selected crate or tag
      let filteredData = rawData;
      if (viewMode === 'crate' && selectedCrateId && crates && crates[selectedCrateId]) {
        const crateTrackIds = crates[selectedCrateId].tracks || [];
        filteredData = rawData.filter(track => crateTrackIds.includes(track.id));
      } else if (viewMode === 'tag' && selectedTagId && tags && tags[selectedTagId]) {
        const tagTrackIds = tags[selectedTagId].tracks || [];
        filteredData = rawData.filter(track => tagTrackIds.includes(track.id));
      }

      const keysWithCats = getAllFeatureKeysAndCategories(filteredData);
      const featureNames = keysWithCats.map(kc => kc.name);
      const featureCats = keysWithCats.map(kc => kc.category);
      setFeatureMetadata({ names: featureNames, categories: featureCats });

      const parsedTracks = filteredData.map(track => {
        if (!track || typeof track !== 'object' || !track.id) return null;
        try {
          const featureVector = mergeFeatureVectors(track, featureNames);
          return { ...track, featureVector };
        } catch (e) { 
          return null; 
        }
      }).filter(Boolean);
      
      setTracks(parsedTracks);
    } catch (err) {
      setError(err.message || 'Unknown error.');
      setTracks([]);
      setFeatureMetadata({ names: [], categories: [] });
    } finally {
      setLoading(false);
    }
  }, [crates, tags, selectedCrateId, selectedTagId, viewMode]);

  // Compute feature min/max values for normalization
  useEffect(() => {
    if (!tracks.length) {
      setFeatureMinMax({});
      return;
    }

    const minMax = {};
    
    tracks.forEach(track => {
      const processFeatures = (features) => {
        try {
          const parsed = typeof features === 'string' ? JSON.parse(features) : features;
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([key, value]) => {
              const v = parseFloat(value);
              if (!isNaN(v)) {
                // Don't use prefixes - keep original key names for X/Y mode compatibility
                if (!(key in minMax)) {
                  minMax[key] = { min: v, max: v };
                } else {
                  minMax[key].min = Math.min(minMax[key].min, v);
                  minMax[key].max = Math.max(minMax[key].max, v);
                }
              }
            });
          }
        } catch (e) {
          // Silently handle parsing errors
        }
      };

      // Process all feature types without prefixes
      processFeatures(track.style_features);
      processFeatures(track.mood_features); 
      processFeatures(track.instrument_features);
      
      // Process spectral features
      const SPECTRAL_KEYWORDS = ['atonal', 'tonal', 'dark', 'bright', 'percussive', 'smooth', 'lufs'];
      SPECTRAL_KEYWORDS.forEach(key => {
        const v = track[key];
        if (typeof v === 'number' && !isNaN(v)) {
          if (!(key in minMax)) {
            minMax[key] = { min: v, max: v };
          } else {
            minMax[key].min = Math.min(minMax[key].min, v);
            minMax[key].max = Math.max(minMax[key].max, v);
          }
        }
      });
    });
    
    setFeatureMinMax(minMax);
  }, [tracks]);

  // Process plot data when tracks or dimensions change
  useEffect(() => {
    if (loading || tracks.length === 0 || svgDimensions.width === 0 || svgDimensions.height === 0) {
      setPlotData([]);
      return;
    }
    
    if (featureMetadata.names.length === 0 && tracks.length > 0) return;

    const validTracksForProcessing = tracks.filter(t => 
      t.featureVector && t.featureVector.length === featureMetadata.names.length
    );
    
    if (validTracksForProcessing.length === 0) {
      if (tracks.length > 0) {
        setError("No tracks have valid features for processing.");
      }
      setPlotData([]);
      return;
    }

    const featureVectors = validTracksForProcessing.map(t => t.featureVector);
    const processedFeatureData = normalizeFeatures(featureVectors, featureMetadata.categories);
    const clusterLabels = hdbscan(processedFeatureData);
    const projectedData = pca(processedFeatureData);

    const newPlotData = validTracksForProcessing.map((track, index) => {
      const p_coords = (projectedData && index < projectedData.length && 
                       projectedData[index]?.length === 2)
                ? projectedData[index] : [0.5, 0.5];
      return {
        ...track,
        originalX: p_coords[0],
        originalY: p_coords[1],
        x: PADDING + p_coords[0] * (svgDimensions.width - 2 * PADDING),
        y: PADDING + p_coords[1] * (svgDimensions.height - 2 * PADDING),
        cluster: clusterLabels[index] ?? -1,
      };
    });
    
    setPlotData(newPlotData);
  }, [tracks, featureMetadata, loading, svgDimensions]);

  // Fetch data on mount
  useEffect(() => {
    fetchTracksData();
  }, [fetchTracksData]);

  return {
    tracks,
    plotData,
    loading,
    error,
    featureMetadata,
    featureMinMax,
    refetch: fetchTracksData
  };
}; 