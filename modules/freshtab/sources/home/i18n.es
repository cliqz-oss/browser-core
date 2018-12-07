/* globals chrome */
import cliqz from './cliqz';

export default function t(key) {
  const product = cliqz.storage.state.config.product;
  const tabName = product.charAt(0) + product.slice(1).toLowerCase();
  return chrome.i18n.getMessage(`freshtab_${key}`, [tabName]);
}

function tt(key, params = []) {
  return chrome.i18n.getMessage(key, params);
}

export { t, tt };
