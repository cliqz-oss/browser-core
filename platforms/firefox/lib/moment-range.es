const global = { };

const momentRangeUrl = 'chrome://cliqz/content/bower_components/moment-range/index.js';

Services.scriptloader.loadSubScriptWithOptions(momentRangeUrl, {
  target: global,
});

export default global['moment-range'];
