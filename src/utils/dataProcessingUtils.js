import { CATEGORY_WEIGHTS, SPECTRAL_KEYWORDS, PCA_N_COMPONENTS, HDBSCAN_DEFAULT_MIN_CLUSTER_SIZE, HDBSCAN_DEFAULT_MIN_SAMPLES, NOISE_CLUSTER_ID } from './constants.js';

/**
 * Calculates Euclidean distance between two vectors
 */
export function calculateDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return Infinity;
  return Math.sqrt(vec1.reduce((sum, val1, i) => {
    const diff = (val1 || 0) - (vec2[i] || 0);
    return sum + diff * diff;
  }, 0));
}

/**
 * Gets all feature keys and their categories from tracks
 */
export function getAllFeatureKeysAndCategories(tracks) {
  const featuresWithCategories = new Map();
  
  const determineFinalCategory = (keyName, sourceCategory) => {
    const lowerKeyName = keyName.toLowerCase();
    if (SPECTRAL_KEYWORDS.includes(lowerKeyName)) return 'spectral';
    if (sourceCategory === 'mood') return 'mood';
    return sourceCategory;
  };

  const processFeatureSource = (featureObj, sourceCategory) => {
    if (!featureObj) return;
    try {
      const parsed = typeof featureObj === 'string' ? JSON.parse(featureObj) : featureObj;
      if (typeof parsed === 'object' && parsed !== null) {
        Object.keys(parsed).forEach(key => {
          const existingCategory = featuresWithCategories.get(key);
          const finalCategory = determineFinalCategory(key, sourceCategory);
          if (!existingCategory || 
              (existingCategory !== 'spectral' && finalCategory === 'spectral') || 
              (existingCategory !== 'spectral' && existingCategory !== 'mood' && finalCategory === 'mood')) {
            featuresWithCategories.set(key, finalCategory);
          } else if (!existingCategory) {
            featuresWithCategories.set(key, finalCategory);
          }
        });
      }
    } catch (e) {
      // Silently handle parsing errors
    }
  };

  tracks.forEach(track => {
    if (!track || !track.id) return;
    processFeatureSource(track.style_features, 'style');
    processFeatureSource(track.instrument_features, 'instrument');
    processFeatureSource(track.mood_features, 'mood');
  });

  SPECTRAL_KEYWORDS.forEach(key => featuresWithCategories.set(key, 'spectral'));

  return Array.from(featuresWithCategories.entries())
    .map(([name, category]) => ({ name, category }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Merges feature vectors from different sources for a track
 */
export function mergeFeatureVectors(track, allFeatureNames) {
  const mergedFeatures = {};
  allFeatureNames.forEach(key => {
    mergedFeatures[key] = 0;
  });

  const parseAndMerge = (featureObj) => {
    if (!featureObj) return;
    try {
      const parsed = typeof featureObj === 'string' ? JSON.parse(featureObj) : featureObj;
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([key, value]) => {
          if (allFeatureNames.includes(key)) {
            const num = parseFloat(value);
            if (!isNaN(num)) mergedFeatures[key] = num;
          }
        });
      }
    } catch (e) {
      // Silently handle parsing errors
    }
  };

  parseAndMerge(track.style_features);
  parseAndMerge(track.instrument_features);
  parseAndMerge(track.mood_features);

  // Add direct spectral features
  SPECTRAL_KEYWORDS.forEach(key => {
    const value = track[key];
    if (typeof value === 'number' && !isNaN(value)) {
      mergedFeatures[key] = value;
    }
  });

  return allFeatureNames.map(key => mergedFeatures[key]);
}

/**
 * Normalizes feature vectors using robust statistics
 */
export function normalizeFeatures(featureVectors, featureCategories) {
  if (!featureVectors || featureVectors.length === 0) return [];
  const numSamples = featureVectors.length;
  const numFeatures = featureVectors[0]?.length || 0;
  if (numFeatures === 0) return featureVectors.map(() => []);

  let categories = featureCategories;
  if (categories.length !== numFeatures) {
    categories = Array(numFeatures).fill('default');
  }

  // Calculate robust statistics (medians and MAD)
  const medians = new Array(numFeatures).fill(0);
  const madValues = new Array(numFeatures).fill(0);

  // Calculate medians
  for (let j = 0; j < numFeatures; j++) {
    const values = featureVectors.map(v => v[j] || 0).sort((a, b) => a - b);
    medians[j] = values[Math.floor(values.length / 2)];
  }

  // Calculate MAD values
  for (let j = 0; j < numFeatures; j++) {
    const deviations = featureVectors.map(v => Math.abs((v[j] || 0) - medians[j]));
    madValues[j] = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)] * 1.4826;
  }

  // Apply robust normalization
  return featureVectors.map(vector =>
    vector.map((value, j) => {
      const mad = madValues[j];
      const median = medians[j];
      const normalizedValue = (mad < 1e-10) ? 0 : ((value || 0) - median) / mad;
      
      // Apply category weights
      const category = (j < categories.length && categories[j]) ? categories[j] : 'default';
      const weight = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS['default'];
      
      // Apply sigmoid function to bound values
      const sigmoid = (x) => 2 / (1 + Math.exp(-x)) - 1;
      return sigmoid(normalizedValue * weight);
    })
  );
}

/**
 * Principal Component Analysis implementation
 */
export function pca(processedData, nComponents = PCA_N_COMPONENTS) {
  if (!processedData || processedData.length === 0) return [];
  const numSamples = processedData.length;
  let numFeatures = processedData[0]?.length || 0;

  if (numFeatures === 0) return processedData.map(() => Array(nComponents).fill(0.5));
  nComponents = Math.min(nComponents, numFeatures > 0 ? numFeatures : nComponents);
  if (nComponents <= 0) return processedData.map(() => []);
  if (numSamples <= 1) return processedData.map(() => Array(nComponents).fill(0.5));

  // Center the data
  const means = processedData[0].map((_, colIndex) => 
    processedData.reduce((sum, row) => sum + (row[colIndex] || 0), 0) / numSamples
  );
  const centeredData = processedData.map(row => 
    row.map((val, colIndex) => (val || 0) - means[colIndex])
  );

  // Calculate covariance matrix
  const covarianceMatrix = Array(numFeatures).fill(0).map(() => Array(numFeatures).fill(0));
  for (let i = 0; i < numFeatures; i++) {
    for (let j = i; j < numFeatures; j++) {
      let sum = 0;
      for (let k = 0; k < numSamples; k++) {
        sum += centeredData[k][i] * centeredData[k][j];
      }
      covarianceMatrix[i][j] = sum / (numSamples - 1);
      if (i !== j) covarianceMatrix[j][i] = covarianceMatrix[i][j];
    }
  }

  // Power iteration for eigenvectors
  const powerIteration = (matrix, numIterations = 100) => {
    const n = matrix.length;
    if (n === 0 || !matrix[0] || matrix[0].length === 0) return [];
    
    let vector = Array(n).fill(0).map(() => Math.random() - 0.5);
    let norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    if (norm < 1e-10) vector = Array(n).fill(0);
    else vector = vector.map(v => v / norm);
    
    if (vector.every(v => v === 0) && n > 0) vector[0] = 1;

    let prevVector = null;
    let iter = 0;
    const convergenceThreshold = 1e-10;

    while (iter < numIterations) {
      let newVector = Array(n).fill(0);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          newVector[r] += (matrix[r]?.[c] || 0) * vector[c];
        }
      }
      
      norm = Math.sqrt(newVector.reduce((s, val) => s + val * val, 0));
      if (norm < 1e-10) return Array(n).fill(0);
      
      newVector = newVector.map(val => val / norm);
      
      if (prevVector) {
        const diff = Math.sqrt(newVector.reduce((s, v, i) => s + Math.pow(v - prevVector[i], 2), 0));
        if (diff < convergenceThreshold) break;
      }
      
      prevVector = [...newVector];
      vector = newVector;
      iter++;
    }
    
    return vector;
  };

  const principalComponents = [];
  let tempCovarianceMatrix = covarianceMatrix.map(row => [...row]);

  // Calculate reference points for sign consistency
  const referencePoints = [];
  for (let i = 0; i < numFeatures; i++) {
    const values = centeredData.map(row => row[i]);
    const sortedValues = [...values].sort((a, b) => a - b);
    const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
    const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
    referencePoints.push((q1 + q3) / 2);
  }

  for (let k = 0; k < nComponents; k++) {
    if (tempCovarianceMatrix.length === 0 || tempCovarianceMatrix.every(row => row.every(val => isNaN(val) || val === 0))) {
      const fallbackPc = Array(numFeatures).fill(0);
      if (k < numFeatures) fallbackPc[k] = 1;
      principalComponents.push(fallbackPc);
      continue;
    }
    
    const pc = powerIteration(tempCovarianceMatrix);
    if (pc.length === 0 || pc.every(v => v === 0)) {
      const fallbackPc = Array(numFeatures).fill(0);
      if (k < numFeatures) fallbackPc[k] = 1;
      principalComponents.push(fallbackPc);
      continue;
    }

    // Ensure sign consistency
    const projection = referencePoints.reduce((sum, val, i) => sum + val * pc[i], 0);
    if (projection < 0) {
      pc.forEach((_, i) => pc[i] = -pc[i]);
    }
    
    principalComponents.push(pc);

    if (k < nComponents - 1 && pc.length > 0) {
      // Deflate the matrix
      const lambda = pc.reduce((sum, val, i) => 
        sum + val * tempCovarianceMatrix[i].reduce((s, v, j) => s + v * pc[j], 0), 0
      );
      
      const newTempCovMatrix = Array(numFeatures).fill(0).map(() => Array(numFeatures).fill(0));
      for (let i = 0; i < numFeatures; i++) {
        for (let j = 0; j < numFeatures; j++) {
          newTempCovMatrix[i][j] = tempCovarianceMatrix[i][j] - lambda * pc[i] * pc[j];
        }
      }
      tempCovarianceMatrix = newTempCovMatrix;
    }
  }

  // Project the data
  const projected = centeredData.map(row =>
    principalComponents.map(pcVector => {
      if (pcVector.length !== row.length) return 0;
      return row.reduce((sum, val, i) => sum + val * (pcVector[i] || 0), 0);
    })
  );

  // Normalize projection to canvas space
  const minMax = Array(nComponents).fill(null).map((_, i) => ({
    min: Math.min(...projected.map(p => p[i])),
    max: Math.max(...projected.map(p => p[i])),
  }));

  return projected.map(p => p.map((val, i) => {
    if (i >= minMax.length || minMax[i] === null) return 0.5;
    const range = minMax[i].max - minMax[i].min;
    if (range < 1e-10) return 0.5;
    
    const centered = (val - minMax[i].min) / range;
    const sigmoid = (x) => 2 / (1 + Math.exp(-4 * (x - 0.5))) - 1;
    return (sigmoid(centered) + 1) / 2;
  }));
}

/**
 * HDBSCAN clustering implementation
 */
export function hdbscan(data, minClusterSize = HDBSCAN_DEFAULT_MIN_CLUSTER_SIZE, minSamples = HDBSCAN_DEFAULT_MIN_SAMPLES) {
  if (!data || data.length === 0) return [];
  const n = data.length;
  if (n === 0) return [];

  const adaptiveMinClusterSize = Math.max(2, Math.min(minClusterSize, Math.floor(n * 0.03)));
  const adaptiveMinSamples = Math.max(2, Math.min(minSamples, Math.floor(n * 0.01)));

  if (n < adaptiveMinClusterSize && n > 0) return Array(n).fill(NOISE_CLUSTER_ID);

  function computeMutualReachabilityDistance() {
    const distances = Array(n).fill(null).map(() => Array(n).fill(0));
    const coreDistances = Array(n).fill(Infinity);
    if (n === 0) return { distances, coreDistances };

    for (let i = 0; i < n; i++) {
      if (n <= 1 || adaptiveMinSamples >= n) { 
        coreDistances[i] = Infinity; 
        continue; 
      }
      const pointDistances = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        pointDistances.push(calculateDistance(data[i], data[j]));
      }
      pointDistances.sort((a, b) => a - b);
      coreDistances[i] = pointDistances[adaptiveMinSamples - 1] ?? Infinity;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const directDist = calculateDistance(data[i], data[j]);
        const mrDist = Math.sqrt(coreDistances[i] * coreDistances[j]) * directDist;
        distances[i][j] = mrDist;
        distances[j][i] = mrDist;
      }
    }
    return distances;
  }

  function buildMST(mutualReachabilityDistances) {
    if (n === 0) return [];
    const mstEdges = [];
    const visited = new Array(n).fill(false);
    const minEdgeWeight = new Array(n).fill(Infinity);
    const edgeToVertex = new Array(n).fill(-1);
    if (n > 0) minEdgeWeight[0] = 0;

    for (let count = 0; count < n; count++) {
      let u = -1, currentMin = Infinity;
      for (let v = 0; v < n; v++) {
        if (!visited[v] && minEdgeWeight[v] < currentMin) {
          currentMin = minEdgeWeight[v];
          u = v;
        }
      }
      if (u === -1) break;
      visited[u] = true;
      if (edgeToVertex[u] !== -1) {
        mstEdges.push([u, edgeToVertex[u], minEdgeWeight[u]]);
      }
      for (let v = 0; v < n; v++) {
        if (!visited[v]) {
          const weightUV = mutualReachabilityDistances[u]?.[v] ?? Infinity;
          if (weightUV < minEdgeWeight[v]) {
            minEdgeWeight[v] = weightUV;
            edgeToVertex[v] = u;
          }
        }
      }
    }
    return mstEdges;
  }

  function extractClustersSimplified(mst) {
    const labels = Array(n).fill(NOISE_CLUSTER_ID);
    if (n === 0 || (mst.length === 0 && n > 0 && adaptiveMinClusterSize > 1)) return labels;
    if (n > 0 && adaptiveMinClusterSize === 1) return Array(n).fill(0).map((_, i) => i);

    let currentClusterId = 0;
    const parent = Array(n).fill(0).map((_, i) => i);
    const componentSize = Array(n).fill(1);

    function findSet(i) {
      if (parent[i] === i) return i;
      return parent[i] = findSet(parent[i]);
    }

    function uniteSets(i, j) {
      let rootI = findSet(i), rootJ = findSet(j);
      if (rootI !== rootJ) {
        if (componentSize[rootI] < componentSize[rootJ]) [rootI, rootJ] = [rootJ, rootI];
        parent[rootJ] = rootI;
        componentSize[rootI] += componentSize[rootJ];
        return true;
      }
      return false;
    }

    const sortedMSTEdges = mst.sort((a, b) => a[2] - b[2]);
    for (const edge of sortedMSTEdges) {
      uniteSets(edge[0], edge[1]);
    }

    const rootToClusterId = new Map();
    for (let i = 0; i < n; i++) {
      const root = findSet(i);
      if (componentSize[root] >= adaptiveMinClusterSize) {
        if (!rootToClusterId.has(root)) {
          rootToClusterId.set(root, currentClusterId++);
        }
        labels[i] = rootToClusterId.get(root);
      } else {
        labels[i] = NOISE_CLUSTER_ID;
      }
    }
    return labels;
  }

  const mutualReachabilityDistances = computeMutualReachabilityDistance();
  const mst = buildMST(mutualReachabilityDistances);
  return extractClustersSimplified(mst);
} 