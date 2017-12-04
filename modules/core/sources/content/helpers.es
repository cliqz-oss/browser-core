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
        window.console.error(`CLIQZ content-script failed: ${e} ${e.stack}`);
      }
    });
  });
}

export function getWindowTreeInformation(window) {
  let currentWindow = window;

  // Keep track of window IDs
  let currentId = getWindowId(window);
  const windowId = currentId;
  let parentFrameId;

  while (currentId !== getWindowId(currentWindow.parent)) {
    // Go up one level
    parentFrameId = currentId;
    currentWindow = currentWindow.parent;
    currentId = getWindowId(currentWindow);
  }

  return {
    tabId: currentId,
    parentFrameId,
    frameId: windowId,
  };
}

export const CHROME_MSG_SOURCE = 'cliqz-content-script';

export function isCliqzContentScriptMsg(msg) {
  return msg.source && msg.source === CHROME_MSG_SOURCE;
}
