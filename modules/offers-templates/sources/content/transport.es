import { chrome } from '../../platform/content/globals';
import { IS_POPUP, SEARCH_PARAMS } from './constants';

/** **************************************************************** */

function render(payload = {}) {
  if (payload.action !== 'pushData') { return; }
  if (window.document && window.document.readyState !== 'loading') {
    window.__globals_draw(payload.data);
  } else {
    window.addEventListener('DOMContentLoaded', () => window.__globals_draw(payload.data));
  }
}
const makeMessage = (action, data) => ({ action, data });

/** **************************************************************** */

export function sendThroughRuntime(action, data, response) {
  chrome.runtime.sendMessage(
    { message: makeMessage(action, data), target: 'cliqz-offers-templates' },
    response
  );
}

export default function send(action, data = {}) {
  if (IS_POPUP) {
    sendThroughRuntime(action, data, render);
  } else {
    const isCrossOrigin = SEARCH_PARAMS.get('cross-origin') !== null;
    const target = isCrossOrigin ? window.parent : window;
    target.postMessage(JSON.stringify({
      target: 'cliqz-offers-templates',
      origin: 'iframe',
      message: makeMessage(action, data),
    }), '*');
  }
}
