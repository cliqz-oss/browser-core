import { registerContentScript, CHROME_MSG_SOURCE } from '../core/content/helpers';
import config from '../core/config';
import { isAMO } from '../core/platform';

registerContentScript(`${config.settings.WORLDCUP_URL}*`, () => {
  function openLink(url) {
    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
      payload: {
        module: 'core',
        action: 'openLink',
        args: [
          url,
          {
            newTab: false,
          }
        ],
      },
    });
  }

  const onLoad = () => {
    const cliqzHistory = window.document.querySelector('#cliqz-history');
    const cliqzHome = window.document.querySelector('#cliqz-home');

    if (!isAMO) {
      cliqzHistory.addEventListener('click', openLink.bind(null, config.settings.HISTORY_URL));
      cliqzHistory.href = config.settings.HISTORY_URL;
      cliqzHistory.style.display = 'inherit';
    }

    cliqzHome.addEventListener('click', openLink.bind(null, config.settings.NEW_TAB_URL));
    cliqzHome.href = config.settings.NEW_TAB_URL;
    cliqzHome.style.display = 'inherit';
  };

  if (window.document.readyState === 'complete') {
    onLoad();
  } else {
    window.document.addEventListener('DOMContentLoaded', onLoad);
  }
});
