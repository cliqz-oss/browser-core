import globToRegexp from './glob';

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

export const CHROME_MSG_SOURCE = 'cliqz-content-script';

export function isCliqzContentScriptMsg(msg) {
  return msg.source && msg.source === CHROME_MSG_SOURCE;
}
