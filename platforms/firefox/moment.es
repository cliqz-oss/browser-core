const global = { };

const momentUrl = 'chrome://cliqz/content/bower_components/moment/min/moment.min.js';

Services.scriptloader.loadSubScriptWithOptions(momentUrl, {
  target: global,
});

export default global.moment;
