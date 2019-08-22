/* eslint object-curly-spacing: off */
import { registerContentScript } from '../core/content/register';
import { onApplyActions, preShowActions } from './content/processing';
import { pop, log, openAndClosePinnedURL } from './content/transport';
import { render } from './content/view';
import { once, retryFunctionSeveralTimes } from './content/utils';

let timerId = null;

// eslint-disable-next-line import/prefer-default-export
export async function renderPopup(window, chrome, CLIQZ, renderOnce, msg = {}) {
  if (msg.url !== window.location.href) { return; } // show only on exact match
  const {config = {}, onApply = '', preShow = '', back, target = 'nobody'} = msg;
  const {ok, config: newConfig} = await retryFunctionSeveralTimes(
    window,
    () => {
      const result = preShowActions(preShow)(window, config);
      const tryAgain = result.config.shouldHideButtons && config.isDynamicPage;
      return { result, tryAgain };
    },
    (waitTimerId) => { timerId = waitTimerId; }
  );

  const info = {back, url: window.location.href};
  log(CLIQZ, {target, data: {...info, type: 'pre-show', ok}});
  if (newConfig.shouldPreventRender) { return; }

  const {
    call_to_action: { url = '' } = {},
    attrs: { landing = [] } = {},
  } = newConfig;
  const openAndClosePinnedURLonce = once(openAndClosePinnedURL);
  renderOnce({
    chrome,
    window,
    onApply: () => {
      onApplyActions(onApply)(window, config);
      openAndClosePinnedURL(CLIQZ, { url, matchPatterns: landing });
      pop(CLIQZ, {target, data: {...info, ok: true}});
    },
    onCancel: type => pop(CLIQZ, {target, data: {...info, ok: false, type}}),
    onCopyCode: () => {
      openAndClosePinnedURLonce(CLIQZ, { url, matchPatterns: landing });
      log(CLIQZ, {target, data: {...info, type: 'copy-code', ok: true}});
    },
    config: newConfig,
  });
  log(CLIQZ, { target, data: {...info, type: 'show', ok: true}});
}

registerContentScript({
  module: 'popup-notification',
  matches: [
    'https://*/*',
    'http://*/*',
  ],
  js: [(window, chrome, CLIQZ) => {
    const renderOnce = once(render);
    const onMessage = (data) => {
      if (window.document && window.document.readyState !== 'loading') {
        renderPopup(window, chrome, CLIQZ, renderOnce, data);
      } else {
        window.addEventListener('DOMContentLoaded', () =>
          renderPopup(window, chrome, CLIQZ, renderOnce, data));
      }
    };

    window.addEventListener('unload', () => {
      if (timerId) { window.clearTimeout(timerId); }
    });

    return {
      renderBanner: onMessage.bind(this),
    };
  }],
});
