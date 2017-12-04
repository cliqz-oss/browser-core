/* global document, Components, Services, localStorage */
"use strict";

(function () {
  var ftConfig = 'extensions.cliqz.freshtabConfig';
  var theme;
  var config;

  // Detect if running in privilidged contenxt, which probably happens if loaded
  // from chrome:// url
  if ((typeof Components !== 'undefined') && (typeof Components.utils !== 'undefined')) {
    // if privilidged - apply some fixes
    theme = 'bg-blue';
    Components.utils.import('resource://gre/modules/Services.jsm');

    if (Services.prefs.getPrefType(ftConfig) === 32) { // pref exists and its char
      try {
        config = JSON.parse(Services.prefs.getCharPref(ftConfig));
        if (config && config.background && config.background.image) {
          theme = config.background.image;
        }
      } catch (e) {
        console.log('Freshtab error (unexpected config) :', e);
      }
    }


    // stop button remains active in Firefox 56
    const chromeWindow = Services.wm.getMostRecentWindow('navigator:browser');
    const reloadButton = chromeWindow.document.getElementById('reload-button');

    if (reloadButton) {
      reloadButton.removeAttribute('displaystop');
    }
  } else {
    // loading as regular content - there is a localStorage
    theme = localStorage.theme;
  }

  if (theme) {
    document.body.classList.add(['theme-', theme].join(''));
  }
})();
