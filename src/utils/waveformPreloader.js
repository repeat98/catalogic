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
      console.log('[WaveformPreloader] No tracks found to preload.');
      return;
    }

    console.log(`[WaveformPreloader] Found ${tracks.length} tracks. Starting iterative caching.`);

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track || !track.id) {
        console.warn('[WaveformPreloader] Skipping invalid track entry:', track);
        continue;
      }

      try {
        // Check if already cached by attempting to get it. 
        // isWaveformCached makes a HEAD request, getCachedWaveform makes a GET.
        // If peaks are needed by WaveSurfer anyway, GET might be fine.
        const alreadyCached = await getCachedWaveform(track.id);
        if (alreadyCached && alreadyCached.peaks) {
          console.log(`[WaveformPreloader] Waveform for track ${track.id} (${track.title}) is already cached. Skipping.`);
          continue;
        }

        console.log(`[WaveformPreloader] Caching waveform for track ${track.id} (${track.title}) (${i + 1}/${tracks.length})`);
        
        const audioUrl = `http://localhost:3000/audio/${track.id}`;

        // Create a temporary, detached container for WaveSurfer
        const tempContainer = document.createElement('div');
        // Important: Do not append to the document body to keep it hidden and avoid layout shifts.
        // Style it to be off-screen if it must be in DOM for some WaveSurfer backends, though often not necessary.
        // tempContainer.style.position = 'absolute';
        // tempContainer.style.left = '-9999px';
        // document.body.appendChild(tempContainer);


        let wavesurfer = null;
        try {
          wavesurfer = WaveSurfer.create({
            container: tempContainer, // Use the temporary container
            backend: 'MediaElement', // MediaElement backend is generally more robust for background processing
            mediaControls: false,
            height: 30, // Minimal height, may not be strictly necessary for peak export
            normalize: false,
            pixelRatio: 1, // No need for high pixel ratio for peak data
            interact: false, // No interaction needed
          });

          await new Promise((resolve, reject) => {
            wavesurfer.once('ready', () => {
              try {
                const peaks = wavesurfer.exportPeaks();
                if (peaks && peaks.length > 0) {
                  cacheWaveform(track.id, { peaks })
                    .then(() => console.log(`[WaveformPreloader] Successfully cached ${track.id}`))
                    .catch(cacheErr => console.error(`[WaveformPreloader] Failed to cache ${track.id}:`, cacheErr))
                    .finally(resolve);
                } else {
                  console.warn(`[WaveformPreloader] No peaks exported for ${track.id}`);
                  resolve(); // Resolve even if no peaks, to continue the loop
                }
              } catch (exportError) {
                console.error(`[WaveformPreloader] Error exporting peaks for ${track.id}:`, exportError);
                reject(exportError); // Propagate error to main catch
              }
            });

            wavesurfer.once('error', (err) => {
              console.error(`[WaveformPreloader] WaveSurfer error for ${track.id} during preloading:`, err);
              reject(err); // Propagate error to main catch
            });

            wavesurfer.load(audioUrl);
          });

        } finally {
          if (wavesurfer) {
            wavesurfer.destroy();
          }
          // if (tempContainer.parentNode) { // If it was appended to body
          //   document.body.removeChild(tempContainer);
          // }
        }
        
        // Wait a bit before processing the next track
        if (i < tracks.length - 1) { // No delay after the last track
            await new Promise(resolve => setTimeout(resolve, PRELOAD_DELAY_MS));
        }

      } catch (error) {
        console.error(`[WaveformPreloader] Failed to process track ${track.id} (${track.title}):`, error);
        // Optional: add a longer delay or stop if too many errors occur
        if (i < tracks.length - 1) {
             await new Promise(resolve => setTimeout(resolve, PRELOAD_DELAY_MS * 2)); // Longer delay on error
        }
      }
    }
    console.log('[WaveformPreloader] Finished background waveform preloading.');
  } catch (error) {
    console.error('[WaveformPreloader] General error during preloading process:', error);
  }
}; 