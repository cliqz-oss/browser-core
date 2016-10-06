window.XPCOMUtils = {
  defineLazyModuleGetter: function(){},
  generateQI: function(){},
};

window.Services = {
  scriptloader: {
    loadSubScript: function(){}
  }
};

window.Components = {
  interfaces: {
    nsIAutoCompleteResult: {}
  },
  utils: {
    import: function(){}
  },
  ID: function(){}
};

window.CLIQZ = {};

System.baseURL = './';

Promise.all([
  System.import("platform/environment"),
  System.import("core/utils"),
  System.import("core/storage"),
  System.import("core/templates"),
  System.import("core/events")
]).then(function (modules) {
  var environment = modules[0].default;
  var utils = modules[1].default;
  var Storage = modules[2].default;
  var handlebars = modules[3].default;
  environment.storage = new Storage();
  window.CLIQZEnvironment = environment;
  window.CliqzUtils = utils;
  window.CliqzHandlebars = handlebars;
  var events = modules[4].default;
  window.CliqzEvents  = events;
  utils.initPlatform(System);
}).then(function () {
  return System.import("core/startup");
}).then(function (startupModule) {
  return startupModule.default(window, [
    "autocomplete",
    "mobile-ui",
    "mobile-dev",
    "mobile-freshtab",
    "mobile-touch",
    "static",
    "yt-downloader"
  ]);
}).then(function () {
  return CliqzUtils.init({
    lang: window.navigator.language || window.navigator.userLanguage
  });
}).then(function () {
  jsAPI.init();
  osAPI.init();
  CliqzUtils.initHomepage(true);
});
