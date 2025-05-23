/**
 * Utility functions for caching and retrieving waveform data
 */

/**
 * Check if a waveform is cached for a given track ID
 * @param {string} trackId - The ID of the track
 * @returns {Promise<boolean>} - Whether the waveform is cached
 */
export const isWaveformCached = async (trackId) => {
  try {
    console.log('Checking if waveform is cached for track:', trackId);
    const response = await fetch(`http://localhost:3000/waveforms/${trackId}`);
    const isCached = response.ok;
    console.log('Waveform cache check result for track', trackId, ':', isCached);
    return isCached;
  } catch (error) {
    console.error('Error checking waveform cache for track', trackId, ':', error);
    return false;
  }
};

/**
 * Get cached waveform data for a track
 * @param {string} trackId - The ID of the track
 * @returns {Promise<Object|null>} - The cached waveform data or null if not found
 */
export const getCachedWaveform = async (trackId) => {
  try {
    console.log('Getting cached waveform for track:', trackId);
    const response = await fetch(`http://localhost:3000/waveforms/${trackId}`);
    if (!response.ok) {
      console.log('No cached waveform found for track', trackId);
      return null;
    }
    const data = await response.json();
    console.log('Retrieved cached waveform data for track', trackId, ':', data);
    return data;
  } catch (error) {
    console.error('Error getting cached waveform for track', trackId, ':', error);
    return null;
  }
};

/**
 * Cache waveform data for a track
 * @param {string} trackId - The ID of the track
 * @param {Object} waveformData - The waveform data to cache
 * @returns {Promise<boolean>} - Whether the caching was successful
 */
export const cacheWaveform = async (trackId, waveformData) => {
  try {
    console.log('Caching waveform for track:', trackId);
    
    // Validate waveform data
    if (!waveformData || !Array.isArray(waveformData.peaks) || waveformData.peaks.length === 0) {
      console.error('Invalid waveform data format for track', trackId, ':', waveformData);
      return false;
    }

    const response = await fetch(`http://localhost:3000/waveforms/${trackId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(waveformData),
    });

    const success = response.ok;
    if (success) {
      const result = await response.json();
      console.log('Waveform cached successfully for track', trackId, ':', result);
    } else {
      console.error('Failed to cache waveform for track', trackId, ':', await response.text());
    }
    return success;
  } catch (error) {
    console.error('Error caching waveform for track', trackId, ':', error);
    return false;
  }
}; 