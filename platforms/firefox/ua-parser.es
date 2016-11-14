const global = {
  window: {
    // placeholder for `UAParser`, which is exported to `window`
  },
};

const uaParserUrl = 'chrome://cliqz/content/bower_components/ua-parser-js/dist/ua-parser.min.js';

Services.scriptloader.loadSubScriptWithOptions(uaParserUrl, {
  target: global,
});

export default global.window.UAParser;
