import {
  registerContentScript,
} from '../core/content/helpers';
import render from './content/view';
import { once } from './content/utils';

const onAction = (offerId, CLIQZ) => (msg) => {
  CLIQZ.app.modules['offers-banner'].action('send', offerId, msg);
};

function renderBanner(data, CLIQZ, renderOnce) {
  const { offerId, config } = data;
  renderOnce(chrome, window, data, onAction(offerId, CLIQZ), config);
}

registerContentScript('offers-banner', 'http*', (window, chrome, CLIQZ) => {
  if (window.top !== window) { return; }
  const renderOnce = once(render);
  const onMessage = ({ module, action, args } = {}) => {
    if (module !== 'offers-banner' || action !== 'renderBanner') { return; }
    renderBanner(args[0], CLIQZ, renderOnce);
  };
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('unload', () => {
    chrome.runtime.onMessage.removeListener(onMessage);
  });
});
