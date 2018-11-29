/**
 * See {{#crossLink "core.ImageDiverter"}}{{/crossLink}}
 *
 * @class ImageDiverterBackground
 * @static
 */
import loggerManager from './logger';
import { toBase64 } from './encoding';
import { fetch as httpFetch } from './http';

const logger = loggerManager.get('core', { prefix: 'image-diverter' });

/**
 * @method _readContentAsDataUrl
 * @param {string} url
 * @returns {Promise_string}
 * @throws
 * @private
 */
async function _readContentAsDataUrl(url) {
  const resp = await httpFetch(url);
  if (!resp.ok) {
    return Promise.reject(resp.statusText);
  }

  const b64Image = toBase64(new Uint8Array(await resp.arrayBuffer()));
  const imageType = resp.headers.get('content-type');
  const dataUrl = `data:${imageType};base64,${b64Image}`;

  return dataUrl;
}

/**
 * Helper for the background script. If the content reader fails, it
 * can't return a rejected promise across contexts, so it signals the
 * failure by returning an empty string.
 *
 * @method handleReadContentAsDataUrl
 * @param {string} url
 * @returns {Promise_string}
 */
export default function handleReadContentAsDataUrl(url) {
  return _readContentAsDataUrl(url)
    .catch((err) => {
      logger.warn(`ReadContentAsDataUrl error: ${err}`);
      return '';
    });
}

// Continued in "content/image-diverter.es"
