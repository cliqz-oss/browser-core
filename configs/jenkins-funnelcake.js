/* eslint-disable */

const base = require('./common/system');
const browserBase = require('./common/browser');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    "id": "funnelcake@cliqz.com",
    "updateURL": "https://s3.amazonaws.com/cdncliqz/update/funnelcake@cliqz.com/latest.rdf",
    "showNewBrandAlert": false,
    "suggestions": false,
    "geolocation": "yes",
    "HW_CHANNEL": "FF01",
    "NEW_TAB_URL": "chrome://cliqz/content/freshtab/home.html",
    "ICONS": {
      "active": { "default" : "control-center/images/privacy-shield-active.svg" },
      "inactive": { "default" : "control-center/images/privacy-shield-inactive.svg" },
      "critical": { "default" : "control-center/images/privacy-shield-inactive.svg" }
    },
    "PAGE_ACTION_ICONS": {
      "default": "control-center/images/page-action-dark.svg",
      "dark": "control-center/images/page-action-light.svg"
    },
    "BACKGROUNDS": {
      "active": "#999999",
      "critical": "#999999"
    },
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"]
  }),
  "default_prefs" : {
    "humanWeb": true
  },
  "modules": [
    "core",
    "core-cliqz",
    "dropdown",
    "firefox-specific",
    "static",
    "autocomplete",
    "geolocation",
    "ui",
    "webrequest-pipeline",
    "human-web",
    "context-menu",
    "performance",
    "hpn",
    "control-center",
    "offers-v2",
    "browser-panel",
    "firefox-tests",
    "message-center",
    "search"
  ],
  "subprojects": [
    {
      "src":"bower_components/jquery/dist",
      "include": ["jquery.min.js"],
      "dest": "vendor"
    },
    {
      "src": "bower_components/handlebars",
      "include": ["handlebars.min.js"],
      "dest": "vendor"
    },
    {
      "src": "bower_components/mathjs/dist",
      "include": ["math.min.js"],
      "dest": "vendor"
    }
  ],
  systemDefault: base.systemConfig,
  builderDefault: base.builderConfig,
  bundleConfigs: Object.assign({}, base.appBundleConfig),
});
