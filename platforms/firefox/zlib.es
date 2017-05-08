const global = { };
global.window = global;

const pakoUrl = 'chrome://cliqz/content/bower_components/pako/dist/pako.min.js';

Services.scriptloader.loadSubScriptWithOptions(pakoUrl, {
  target: global,
});

const inflate = global.pako.inflate;
const deflate = global.pako.deflate;

export { inflate, deflate };
