import { chrome } from '../../platform/content/globals';
import { IS_POPUP, SEARCH_PARAMS } from './common/utils';

function response(payload = {}) {
  if (payload.action !== 'pushData') { return; }
  if (window.document && window.document.readyState !== 'loading') {
    window.__globals_draw(payload.data);
  } else {
    window.addEventListener('DOMContentLoaded', () => window.__globals_draw(payload.data));
  }
}

export default function send(action, data = {}) {
  const message = { action, data };
  if (IS_POPUP) {
    chrome.runtime.sendMessage({ message, target: 'cliqz-offers-cc' }, response);
  } else {
    const isCrossOrigin = SEARCH_PARAMS.get('cross-origin') !== null;
    const target = isCrossOrigin ? window.parent : window;
    target.postMessage(JSON.stringify({
      target: 'cliqz-offers-cc',
      origin: 'iframe',
      message
    }), '*');
  }
}
