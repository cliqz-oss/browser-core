'use strict';

const webExt = require('web-ext');
const path = require('path');

const OUTPUT_PATH = process.env.OUTPUT_PATH;
const FIREFOX_PATH = process.env.FIREFOX_PATH;

const options = {
  noReload: true,
  sourceDir: path.join(OUTPUT_PATH, 'cliqz@cliqz.com'),
  artifactsDir: path.join(OUTPUT_PATH, 'cliqz@cliqz.com'),
  startUrl: 'resource://cliqz/firefox-tests/run-testem.html',
  customPrefs: {
    'extensions.cliqz.showConsoleLogs': true,
  },
};

if (FIREFOX_PATH) {
  options.firefox = FIREFOX_PATH;
}

const logStream = webExt.util.logger.consoleStream
logStream.makeVerbose();
logStream.startCapturing();

logStream.addListener(msg => {
  const prefix = '[firefox/index.js][debug] Firefox stdout: TAP:  ';
  if (msg.indexOf(prefix) === 0) {
    const log = msg.substr(prefix.length).replace(/\nTAP:  /g, '\n');
    log.split('\n').forEach(m => console.log(m));
  }
  logStream.clear();
});

webExt.run(options);
