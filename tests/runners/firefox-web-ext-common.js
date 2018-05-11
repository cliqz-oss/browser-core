const webExt = require('web-ext');
const path = require('path');
const fs = require('fs');

const autoConfig = require('./autoconfig.js').settings;
const configFilePath = process.env.CLIQZ_CONFIG_PATH;
const cliqzConfig = require(path.resolve(configFilePath));

const OUTPUT_PATH = process.env.OUTPUT_PATH || './build';
const FIREFOX_PATH = process.env.FIREFOX_PATH;


function run(entrypoint = 'resource://cliqz/firefox-tests/run-testem.html') {
  const options = {
    noReload: true,
    sourceDir: path.resolve(OUTPUT_PATH, cliqzConfig.settings.id),
    artifactsDir: path.resolve(OUTPUT_PATH, cliqzConfig.settings.id),
    startUrl: entrypoint,
    customPrefs: autoConfig,
  };

  if (FIREFOX_PATH) {
    options.firefox = FIREFOX_PATH;
  }

  const logStream = webExt.util.logger.consoleStream;
  logStream.makeVerbose();
  logStream.startCapturing();

  const prefix = '[firefox/index.js][debug] Firefox stdout: TAP:  ';
  logStream.addListener((message) => {
    if (message.indexOf(prefix) === 0) {
      console.log(message
        .substr(prefix.length)            // Remove 'TAP:  ' prefix
        .split('\n')                      // Remove empty lines
        .filter(l => l.trim().length > 0) // ^
        .map((line) => {
          if (line.startsWith('TAP:  ')) {
            return line.substr(6);
          }
          return line;
        })
        .join('\n')
      );
    }
    logStream.clear();
  });

  webExt.run(options);
}

exports.run = run;
