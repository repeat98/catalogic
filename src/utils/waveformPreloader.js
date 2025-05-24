import WaveSurfer from 'wavesurfer.js';
import { isWaveformCached, cacheWaveform, getCachedWaveform } from './waveformCache';

const PRELOAD_DELAY_MS = 500; // Delay between processing each track to be less resource intensive

/**
 * Iteratively preloads and caches waveforms for all tracks in the database.
 */
export const preloadAllWaveforms = async () => {
  console.log('[WaveformPreloader] Starting background waveform preloading...');
  try {
    const response = await fetch('http://localhost:3000/tracks');
    if (!response.ok) {
      console.error('[WaveformPreloader] Failed to fetch track list:', response.status, await response.text());
      return;
    }
    const tracks = await response.json();
    if (!tracks || tracks.length === 0) {
      // console.log('[WaveformPreloader] No tracks found to preload.'); // This one can be kept if desired, but commented for now to be very quiet.
      return;
    }

    // console.log(`[WaveformPreloader] Found ${tracks.length} tracks. Starting iterative caching.`); // Definitely comment this one

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track || !track.id) {
        console.warn('[WaveformPreloader] Skipping invalid track entry:', track);
        continue;
      }

      try {
        const alreadyCached = await getCachedWaveform(track.id);
        if (alreadyCached && alreadyCached.peaks) {
          // console.log(`[WaveformPreloader] Waveform for track ${track.id} (${track.title}) is already cached. Skipping.`); // Commented out
          continue;
        }

        // console.log(`[WaveformPreloader] Caching waveform for track ${track.id} (${track.title}) (${i + 1}/${tracks.length})`); // Commented out
        
        const audioUrl = `http://localhost:3000/audio/${track.id}`;

        const tempContainer = document.createElement('div');

        let wavesurfer = null;
        try {
          wavesurfer = WaveSurfer.create({
            container: tempContainer, 
            backend: 'MediaElement', 
            mediaControls: false,
            height: 30, 
            normalize: false,
            pixelRatio: 1, 
            interact: false, 
          });

          await new Promise((resolve, reject) => {
            wavesurfer.once('ready', () => {
              try {
                const peaks = wavesurfer.exportPeaks();
                if (peaks && peaks.length > 0) {
                  cacheWaveform(track.id, { peaks })
                    // .then(() => console.log(`[WaveformPreloader] Successfully cached ${track.id}`)) // Commented out
                    .catch(cacheErr => console.error(`[WaveformPreloader] Error caching waveform for ${track.id}:`, cacheErr))
                    .finally(resolve);
                } else {
                  console.warn(`[WaveformPreloader] No peaks exported for ${track.id}`);
                  resolve(); 
                }
              } catch (exportError) {
                console.error(`[WaveformPreloader] Error exporting peaks for ${track.id}:`, exportError);
                reject(exportError); 
              }
            });

            wavesurfer.once('error', (err) => {
              console.error(`[WaveformPreloader] WaveSurfer error for ${track.id} during preloading:`, err);
              reject(err); 
            });

            wavesurfer.load(audioUrl);
          });

        } finally {
          if (wavesurfer) {
            wavesurfer.destroy();
          }
        }
        
        if (i < tracks.length - 1) { 
            await new Promise(resolve => setTimeout(resolve, PRELOAD_DELAY_MS));
        }

      } catch (error) {
        console.error(`[WaveformPreloader] Error processing track ${track.id} (${track.title}):`, error);
        if (i < tracks.length - 1) {
             await new Promise(resolve => setTimeout(resolve, PRELOAD_DELAY_MS * 2)); 
        }
      }
    }
    console.log('[WaveformPreloader] Finished background waveform preloading.');
  } catch (error) {
    console.error('[WaveformPreloader] General error during preloading process:', error);
  }
}; 