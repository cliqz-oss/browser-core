/* globals chrome */

export default function t(key) {
  return chrome.i18n.getMessage(key);
}
