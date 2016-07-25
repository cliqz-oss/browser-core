CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}

CliqzUtils.initPlatform(System);

System.import("core/startup").then(function (startupModule) {
  return startupModule.default(window, [
    "core",
    "mobile-ui",
    "mobile-dev",
    "mobile-freshtab",
    "mobile-touch",
    "static",
    "yt-downloader"
  ]);
}).then(function () {
  return CliqzUtils.init(window);
}).then(function () {
  osAPI.init();
  CLIQZEnvironment.initHomepage(true);
});
