// Simple cache and request deduplication for track data
let trackDataCache = null;
let trackDataPromise = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * Fetch tracks with deduplication and caching
 * @param {string} apiUrl - The API endpoint URL
 * @returns {Promise<Array>} - Promise resolving to tracks array
 */
export const fetchTracksWithCache = async (apiUrl = 'http://localhost:3000/tracks') => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (trackDataCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return trackDataCache;
  }
  
  // If there's already a request in flight, wait for it
  if (trackDataPromise) {
    return trackDataPromise;
  }
  
  // Create new request
  trackDataPromise = fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error("Invalid data: Expected array.");
      }
      
      // Cache the result
      trackDataCache = data;
      cacheTimestamp = Date.now();
      trackDataPromise = null; // Clear the promise
      
      return data;
    })
    .catch(error => {
      trackDataPromise = null; // Clear the promise on error
      throw error;
    });
  
  return trackDataPromise;
};

/**
 * Clear the cache (useful for forcing refresh)
 */
export const clearTrackDataCache = () => {
  trackDataCache = null;
  trackDataPromise = null;
  cacheTimestamp = 0;
}; 