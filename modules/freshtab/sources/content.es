import { registerContentScript } from '../core/content/helpers';
import config from '../core/config';

registerContentScript('freshtab', `${config.settings.WORLDCUP_URL}*`, (window, _, CLIQZ) => {
  function openLink(url) {
    CLIQZ.app.modules.core.action('openLink', url, { newTab: false });
  }

  const onLoad = () => {
    const cliqzHistory = window.document.querySelector('#cliqz-history');
    const cliqzHome = window.document.querySelector('#cliqz-home');
    // TODO: it duplicates core/platform logic - but core apis are not allowed in content-scripts
    const isAMO = config.settings.channel === '04';
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
