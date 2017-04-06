System.config({
  map: {
    'math': "bower_components/mathjs/dist/math.min.js",
    'viewpager': "js/libs/viewpager.js"
  }
})
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

var startup, loadModule;

System.set(System.normalizeSync('system'), System.newModule({default: System}));
document.addEventListener("DOMContentLoaded", function () {
  System.import("platform/startup").then(function (startupModule) {
    startup = startupModule.default;
    loadModule = startupModule.loadModule
    return Promise.all([
      System.import("platform/environment"),
      System.import("core/utils"),
      System.import("core/storage"),
      System.import("core/events")
    ])
  }).then(function (modules) {
    var environment = modules.shift().default;
    var utils = modules.shift().default;
    var Storage = modules.shift().default;
    var events = modules.shift().default;
    environment.storage = new Storage();
    window.CLIQZEnvironment = environment;
    window.CliqzUtils = utils;
    window.CliqzEvents  = events;
    utils.setPref("incognito", false);
  }).then(function () {
    return startup(window, [
      "mobile-dev",
    ]);
  }).then(function () {
    osAPI.init();
  }).then(function () {
    return Promise.all(
      [
        "autocomplete",
        "mobile-ui",
        "static",
        "yt-downloader"
      ].map(loadModule)
    );
  }).then(function () {
    osAPI.isReady();
    CliqzUtils.fetchAndStoreConfig();
  });
});
