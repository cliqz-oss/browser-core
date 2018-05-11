/* globals chrome */
export default function t(key, params) {
  return chrome.i18n.getMessage(`freshtab.${key}`, params);
}
