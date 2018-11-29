import {
  registerContentScript,
} from '../core/content/helpers';
import render from './content/view';
import { once } from './content/utils';

const onAction = ({ type, offerId, CLIQZ, autoTrigger }) => (msg) => {
  CLIQZ.app.modules['offers-banner'].action('send', type, offerId, msg, autoTrigger);
};

function renderBanner(payload, CLIQZ, renderOnce) {
  const { offerId, config, autoTrigger, data } = payload;
  const action = onAction({
    type: config.type,
    offerId,
    CLIQZ,
    autoTrigger,
  });
  if (autoTrigger) {
    renderOnce(chrome, window, data, action, config);
  } else {
    render(chrome, window, data, action, config);
  }
}

registerContentScript('offers-banner', 'http*', (window, chrome, CLIQZ) => {
  if (window.top !== window) { return; }
  const renderOnce = once(render);
  const onMessage = ({ module, action, args } = {}) => {
    if (module !== 'offers-banner' || action !== 'renderBanner') { return; }
    if (window.document && window.document.readyState !== 'loading') {
      renderBanner(args[0], CLIQZ, renderOnce);
    } else {
      window.addEventListener('DOMContentLoaded', () => renderBanner(args[0], CLIQZ, renderOnce));
    }
  };
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('unload', () => {
    chrome.runtime.onMessage.removeListener(onMessage);
  });
});
