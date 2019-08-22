import { registerContentScript } from '../core/content/register';
import Handler from './content/handler';

const onAction = (CLIQZ, { type, offerId, autoTrigger }) => (msg) => {
  CLIQZ.app.modules['offers-banner'].action('send', type, offerId, msg, autoTrigger);
};

function renderBanner(payload, CLIQZ, handler) {
  const { offerId, config, autoTrigger, data } = payload;
  const onaction = onAction(CLIQZ, { type: config.type, offerId, autoTrigger });
  const newPayload = data.isPair
    ? { ...data, popup: { ...data.popup, autoTrigger } }
    : { ...data, autoTrigger };

  handler.showBanner({ config, onaction, payload: newPayload });
}

function contentScript(window, chrome, CLIQZ) {
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
}

registerContentScript({
  module: 'offers-banner',
  matches: [
    'http://*/*',
    'https://*/*',
  ],
  allFrames: true,
  js: [contentScript],
});
