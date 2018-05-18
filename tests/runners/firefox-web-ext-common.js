const webExt = require('@cliqz-oss/web-ext');
const path = require('path');
const fs = require('fs');

const autoConfig = require('./autoconfig.js').settings;
const configFilePath = process.env.CLIQZ_CONFIG_PATH;
const cliqzConfig = require(path.resolve(configFilePath));

const OUTPUT_PATH = process.env.OUTPUT_PATH || './build';
const FIREFOX_PATH = process.env.FIREFOX_PATH;
const GREP = process.env.MOCHA_GREP || '';


function run(prefs) {
  if (!prefs) {
    prefs = {};
  }

  const options = {
    noReload: true,
    sourceDir: path.resolve(OUTPUT_PATH, cliqzConfig.settings.id),
    artifactsDir: path.resolve(OUTPUT_PATH, cliqzConfig.settings.id),
    customPrefs: Object.assign({
      'lightweightThemes.selectedThemeID': 'firefox-compact-light@mozilla.org',
      'extensions.cliqz.firefox-tests.closeOnFinish': 1,
      'extensions.cliqz.firefox-tests.grep': GREP,
    }, autoConfig, prefs),
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
