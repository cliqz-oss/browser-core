/* global window */

// For ghostery compatibility
const chrome = window.browser || window.chrome;

export {
  chrome,
  window
};

export function isContentScriptsSupported() {
  return typeof window.browser !== 'undefined' && window.browser.contentScripts;
}
