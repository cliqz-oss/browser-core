import { SEARCH_PARAMS } from './common/utils';

export default function send(action, data = {}) {
  const message = { action, data };
  const isCrossOrigin = SEARCH_PARAMS.get('cross-origin') !== null;
  const target = isCrossOrigin ? window.parent : window;
  target.postMessage(JSON.stringify({
    target: 'cliqz-offers-checkout',
    origin: 'iframe',
    message
  }), '*');
}
