/* eslint object-curly-spacing: off */
import {
  registerContentScript,
} from '../core/content/helpers';
import { onApplyActions, preShowActions } from './content/processing';
import { pop, log } from './content/transport';
import { render } from './content/view';
import { once } from './content/utils';

const renderPopup = (window, chrome, CLIQZ, renderOnce) => (msg) => {
  const {action, module, target = 'nobody', data = {}, url} = msg;
  const href = window.location.href;
  if (url !== href || module !== 'popup-notification' || action !== 'push') {
    return;
  }

  const {config = {}, onApply = '', preShow = '', back} = data;
  const {ok, config: newConfig} = preShowActions(preShow)(window, config);
  const info = {back, url: href};
  log(CLIQZ, {target, data: {...info, type: 'pre-show', ok}});
  if (newConfig.shouldPreventRender) { return; }

  renderOnce({
    chrome,
    window,
    onApply: () => {
      onApplyActions(onApply)(window, config);
      pop(CLIQZ, {target, data: {...info, ok: true}});
    },
    onCancel: type => pop(CLIQZ, {target, data: {...info, ok: false, type}}),
    onCopyCode: () => log(CLIQZ, {target, data: {...info, type: 'copy-code', ok: true}}),
    config: newConfig,
  });
  log(CLIQZ, { target, data: {...info, type: 'show', ok: true}});
};

registerContentScript('popup-notification', 'http*', (window, chrome, CLIQZ) => {
  const renderOnce = once(render);
  const onMessage = renderPopup(window, chrome, CLIQZ, renderOnce);
  if (window.top === window) {
    window.addEventListener('DOMContentLoaded', () => {
      chrome.runtime.onMessage.addListener(onMessage);
    });
    window.addEventListener('unload', () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    });
  }
});
