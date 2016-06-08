CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}

CliqzUtils.initPlatform(System);

System.import("core/startup").then(function (startupModule) {
  return startupModule.default(window, [
    "core",
    "mobile-ui",
    "mobile-dev",
    "mobile-freshtab",
    "mobile-touch",
    "static"
  ]);
}).then(function () {
  CliqzUtils.init(window);
  osAPI.init();
  CLIQZEnvironment.initHomepage(true);
});
