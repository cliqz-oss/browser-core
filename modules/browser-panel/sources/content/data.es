/* global draw */
import { chrome } from '../../platform/content/globals';
import logger from '../logger';

// load images through extension
const OFFERS_TEMPLATES_MODULE = 'cliqz-offers-templates';
const GET_IMAGE_AS_DATA_URL_ACTION = 'getImageAsDataurl';

const makeMessage = (action, data) => ({ action, data });

/**
 * @param {string} action
 * @param {any} data
 * @returns {Promise<any>} resolves to result from action, if any,
 * or rejects on connection error
 */
function sendThroughRuntime(target, action, data) {
  const message = makeMessage(action, data);
  return new Promise((resolve, reject) =>
    chrome.runtime.sendMessage(
      { message, target },
      function callback(result) {
        if (!arguments.length) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      }
    ));
}

/**
 * @param {string} url
 * @returns {Promise<string>} always resolves either to the `data:` url of the image
 * at the given `url` when successful, or to the empty string otherwise, never rejects.
 */
export async function getImageAsDataurl(url) {
  try {
    const result = await sendThroughRuntime(
      OFFERS_TEMPLATES_MODULE,
      GET_IMAGE_AS_DATA_URL_ACTION,
      { url }
    );
    return result?.dataurl || '';
  } catch (error) {
    logger.warn('browser-bundle:get-image-as-dataurl:', error);
    return '';
  }
}

// iframe to browser window
export function sendMessageToWindow(message) {
  const searchParams = new URLSearchParams(window.location.search);
  const isCrossOrigin = searchParams.get('cross-origin') !== null;
  const target = isCrossOrigin ? window.parent : window;
  target.postMessage(JSON.stringify({
    target: 'cqz-browser-panel-re',
    origin: 'iframe',
    message
  }), '*');
}

// browser window to iframe
export function messageHandler(message) {
  switch (message.action) {
    case 'render_template': {
      draw(message.data);
      break;
    }
    default:
      break;
  }
}

window.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.target === 'cqz-browser-panel-re'
     && data.origin === 'window') {
    messageHandler(data.message);
  }
});
