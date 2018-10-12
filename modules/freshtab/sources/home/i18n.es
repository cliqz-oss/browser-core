/* globals chrome */

import config from '../config';

export default function t(key) {
  const tabName = config.features.ghosteryTab.enabled ? 'Ghostery' : 'Cliqz';
  return chrome.i18n.getMessage(`freshtab_${key}`, [tabName]);
}

function tt(key, params = []) {
  return chrome.i18n.getMessage(key, params);
}

export { t, tt };
