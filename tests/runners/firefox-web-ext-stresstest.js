const runner = require('./firefox-web-ext-common.js');

runner.run({
  'extensions.cliqz.firefox-tests.forceExtensionReload': 1,
});
