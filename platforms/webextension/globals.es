import window from './globals-window';
import chrome from './globals-chrome';

export {
  chrome,
  window
};

export function isContentScriptsSupported() {
  return window !== undefined && typeof window.browser !== 'undefined' && window.browser.contentScripts;
}
