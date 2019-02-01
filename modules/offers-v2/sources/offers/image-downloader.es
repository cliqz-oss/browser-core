import { getResourceUrl } from '../../core/platform';
import { toBase64 } from '../../core/encoding';
import { fetch as httpFetch } from '../../core/http';
import { setTimeout as coreSetTimeout } from '../../core/timers';
import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';

export const FALLBACK_IMAGE = getResourceUrl('offers-v2/images/offers-cc-icon.svg');
const DOWNLOAD_WITHIN_TIMEOUT_MS = 2000;
const INTERVAL_BETWEEN_DOWNLOAD_BATCHES_MS = 1000 * 60 * 10; // 10 minutes

/**
 * The problem:
 *
 * - Offers are injected into the html pages.
 * - Browser downloads offer images in the context of the page.
 * - Third-party privacy extensions might categorize the images
 *   as trackers and blacklist Cliqz.
 *
 * The solution:
 *
 * Download images in advance, before pushing offers to real estates.
 * Images are stored inside offer objects as data-urls.
 *
 * @class ImageDownloader
 */

function isAlreadyDownloaded(dataurl) {
  return dataurl && dataurl.startsWith('data:');
}

function shouldDownload(url, dataurl) {
  return url && !isAlreadyDownloaded(dataurl);
}
async function downloadOneImage(url, callback, fetch) {
  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new Error(`offers/image-downloader: Can't fetch '${url}': ${e.message}`);
  }
  if (!resp.ok) {
    throw new Error(`offers/image-downloader: Can't fetch '${url}': ${resp.status}/${resp.statusText}`);
  }

  // `Response` of mocked fetch doesn't have `arrayBuffer` function,
  // but has a similar functionality under other name.
  const content = await (resp.arrayBuffer ? resp.arrayBuffer() : resp.buffer());

  const b64Image = toBase64(new Uint8Array(content));
  const imageType = resp.headers.get('content-type');
  const dataUrl = `data:${imageType};base64,${b64Image}`;
  callback(dataUrl);
}

/**
 * @class ImageDownloaderForPush
 */
class ImageDownloaderForPush {
  constructor({ fetch = httpFetch, setTimeout = coreSetTimeout } = {}) {
    this.fetch = fetch;
    this.setTimeout = setTimeout;
  }

  /**
   * Download the image at `url` within time limit `DOWNLOAD_WITHIN_TIMEOUT_MS`.
   * Image is encoded as data-url and returned using `callback`.
   *
   * If time limit is reached or a download error is happened, we can:
   * - return a fallback image, or
   * - return `url` as is.
   *
   * The first option was the initial approach. Later we noticed that
   * on a first browser startup with offers onboarding, the browser was
   * too busy, misses the deadline and displayed the fallback image.
   * Such behavior spoils the first impression, therefore we have
   * switched to the second option.
   *
   * If the image is successfully downloaded after time limit is reached,
   * `callback` is called second time.
   * *Danger* This call happens after the returned promise is resolved.
   *
   * @method downloadWithinTimeLLimit
   * @param {string} url
   * @param {string} dataurl
   * @param {(dataurl)=>*} callback
   * @returns {Promise<*>}
   */
  async downloadWithinTimeLimit(url, dataurl, callback) {
    if (!shouldDownload(url, dataurl)) {
      return;
    }

    let fetchIsDone = false;
    const fetcher = downloadOneImage(url, callback, this.fetch)
      .then(() => { fetchIsDone = true; })
      .catch((e) => { logger.warn(e.message); });
    const waiter = new Promise(resolve => this.setTimeout(resolve, DOWNLOAD_WITHIN_TIMEOUT_MS));

    await Promise.race([fetcher, waiter]);
    if (!fetchIsDone && (dataurl !== url)) {
      callback(url);
    }
  }
}

/**
 * @class ImageDownloadForOfferDB
 */
class ImageDownloaderForOfferDB {
  constructor({ fetch = httpFetch } = {}) {
    this.fetch = fetch;
    this.lastActiveBatchTsMs = 0;
    this.nThreads = 0; // variable is used also by integration tests
  }

  /**
   * - Immediately return a downloaded image
   * . - `dataurl` if the image is already downloaded
   * . - fallback image if is not downloaded yet
   * . - `url` for transition between extension versions
   * - Additionally, start downloading the image and return it
   *   (or the fallback image) when ready.
   *
   * The downloaded image is returned through `calback`.
   * If an image was not downloaded, the callback is called twice.
   *
   * Code will not download an image too often. Downloading is disabled
   * for `INTERVAL_BETWEEN_DOWNLOAD_BATCHES_MS`.
   *
   * @method download
   * @param {string} url
   * @param {string} dataurl
   * @param {(dataurl)=>*} callback
   * @returns {Promise<*>}
   */
  async download(url, dataurl, callback) {
    if (!shouldDownload(url, dataurl)) {
      return false;
    }
    const cbUrl = dataurl ? FALLBACK_IMAGE : url;
    if (cbUrl !== dataurl) {
      callback(cbUrl);
    }
    if (timestampMS() - this.lastActiveBatchTsMs < INTERVAL_BETWEEN_DOWNLOAD_BATCHES_MS) {
      return false;
    }
    this.nThreads += 1;
    return downloadOneImage(url, callback, this.fetch)
      .catch((e) => {
        logger.warn(e.message);
        if (dataurl !== FALLBACK_IMAGE) {
          callback(FALLBACK_IMAGE);
        }
      }).then(() => {
        this.nThreads -= 1;
        if (this.nThreads < 0) {
          logger.warn('ImageDownloaderForOfferDB: number of threads is below zero');
        }
      });
  }

  /**
   * Too throttle image downloading, record the last time of download activity.
   *
   * @param {number} ts  used by tests to reset the state
   * @method markBatch
   */
  markBatch(ts = timestampMS()) {
    if (!this.nThreads) {
      return;
    }
    this.lastActiveBatchTsMs = ts;
  }
}

export { ImageDownloaderForPush, ImageDownloaderForOfferDB };
