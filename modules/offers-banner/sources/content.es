/* eslint no-param-reassign: off */

import { registerContentScript } from '../core/content/helpers';
import Handler from './content/handler';

const onAction = ({ type, offerId, CLIQZ, autoTrigger }) => (msg) => {
  CLIQZ.app.modules['offers-banner'].action('send', type, offerId, msg, autoTrigger);
};

function renderBanner(payload, CLIQZ, handler) {
  const { offerId, config, autoTrigger, data } = payload;
  const action = onAction({
    type: config.type,
    offerId,
    CLIQZ,
    autoTrigger,
  });
  handler.payload = data.isPair
    ? { ...data, popup: { ...data.popup, autoTrigger } }
    : { ...data, autoTrigger };
  handler.config = config;
  handler.onaction = action;

  if (autoTrigger) {
    handler.showBanner();
  } else {
    handler.toggleBanner();
  }
}

registerContentScript('offers-banner', 'http*', function contentScript(window, chrome, CLIQZ) {
  if (window.top !== window) { return {}; }
  const handler = new Handler({ window });
  const onMessage = (data) => {
    if (window.document && window.document.readyState !== 'loading') {
      renderBanner(data, CLIQZ, handler);
    } else {
      window.addEventListener('DOMContentLoaded', () => renderBanner(data, CLIQZ, handler));
    }
  };
  return {
    renderBanner: onMessage.bind(this),
    closeBanner: () => handler.removeBanner(),
  };
});
