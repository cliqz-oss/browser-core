// https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
function globsMatch(find, source) {
  find = find.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
  find = find.replace(/\*/g, ".*");
  find = find.replace(/\?/g, ".");
  var regEx = new RegExp(find, "i");
  return regEx.test(source);
}

var CONTENT_SCRIPTS = {};

function registerContentScript(urlPattern, script) {
  CONTENT_SCRIPTS[urlPattern] = CONTENT_SCRIPTS[urlPattern] || [];
  CONTENT_SCRIPTS[urlPattern].push(script);
}

function runContentScripts(window) {
  var currentUrl = window.location.href;
  var matchingPatterns = Object.keys(CONTENT_SCRIPTS)
    .filter(function (pattern) {
      return globsMatch(pattern, currentUrl);
    });
  matchingPatterns.forEach(function (pattern) {
    CONTENT_SCRIPTS[pattern].forEach(function (contentScript) {
      try {
        contentScript(window)
      } catch (e) {
        window.console.error("CLIQZ content-script failed", e);
      }
    });
  });
}
