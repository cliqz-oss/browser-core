/* globals chrome */
export default function t(key, params = []) {
  return chrome.i18n.getMessage(`freshtab.${key}`, params);
}

export function tt(key, params = []) {
  return chrome.i18n.getMessage(key, params);
}
