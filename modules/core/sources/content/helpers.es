import globToRegexp from './glob';
import { getWindowId } from '../../platform/content/helpers';

export { getWindowId } from '../../platform/content/helpers';

const CONTENT_SCRIPTS = {};

export function registerContentScript(urlPattern, script) {
  CONTENT_SCRIPTS[urlPattern] = CONTENT_SCRIPTS[urlPattern] || [];
  CONTENT_SCRIPTS[urlPattern].push(script);
}

export function runContentScripts(window, chrome, windowId) {
  const currentUrl = window.location.href;
  const matchingPatterns = Object.keys(CONTENT_SCRIPTS)
    .filter((pattern) => {
      const regexp = globToRegexp(pattern);
      return regexp.test(currentUrl);
    });
  matchingPatterns.forEach((pattern) => {
    CONTENT_SCRIPTS[pattern].forEach((contentScript) => {
      try {
        contentScript(window, chrome, windowId);
      } catch (e) {
        window.console.error('CLIQZ content-script failed', e);
      }
    });
  });
}

export function throttle(window, fn, threshhold) {
  let last;
  let timer;
  return (...args) => {
    const now = Date.now();
    if (last && now < last + threshhold) {
      // reset timeout
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        last = now;
        fn(...args);
      }, threshhold);
    } else {
      last = now;
      fn(...args);
    }
  };
}

export function getWindowTreeInformation(window) {
  let currentWindow = window;

  // Keep track of window IDs
  let currentId = getWindowId(window);
  const windowId = currentId;
  let parentId;

  while (currentId !== getWindowId(currentWindow.parent)) {
    // Go up one level
    parentId = currentId;
    currentWindow = currentWindow.parent;
    currentId = getWindowId(currentWindow);
  }

  return {
    originWindowID: currentId,
    parentWindowID: parentId,
    outerWindowID: windowId,
  };
}
