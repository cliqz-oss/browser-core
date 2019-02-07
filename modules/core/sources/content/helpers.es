import globToRegexp from './glob';

const CONTENT_SCRIPTS = {};

export function isTopWindow(window) {
  return window.self === window.top;
}

export function registerContentScript(moduleName, urlPattern, script) {
  CONTENT_SCRIPTS[urlPattern] = CONTENT_SCRIPTS[urlPattern] || [];
  CONTENT_SCRIPTS[urlPattern].push({ moduleName, contentScript: script });
}

export function runContentScripts(window, chrome, CLIQZ) {
  const currentUrl = window.location.href;
  const matchingPatterns = Object.keys(CONTENT_SCRIPTS)
    .filter((pattern) => {
      const regexp = globToRegexp(pattern);
      return regexp.test(currentUrl);
    });
  const contentScriptsOnMessage = {};
  matchingPatterns.forEach((pattern) => {
    CONTENT_SCRIPTS[pattern]
      .filter(({ moduleName }) => (CLIQZ.app.modules[moduleName] || {}).isEnabled)
      .forEach(({ contentScript, moduleName }) => {
        try {
          contentScriptsOnMessage[moduleName] = contentScript(window, chrome, CLIQZ) || {};
        } catch (e) {
          window.console.error(`CLIQZ content-script failed: ${e} ${e.stack}`);
        }
      });
  });
  return contentScriptsOnMessage;
}
