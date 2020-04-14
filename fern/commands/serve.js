/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { spawn } = require('child_process');
const path = require('path');

const notifier = require('node-notifier');
const moment = require('moment');

const {
  configParameter,
  createBuildWatcher,
  getExtensionVersion,
  setConfigPath,
} = require('../common');

module.exports = (program) => {
  program.command(`serve ${configParameter}`)
    .option('--lint', 'Lint code')
    .option('--no-maps', 'disables source maps')
    .option('--no-debug', 'disables debug pages')
    .option('--version [version]', 'sets extension version', 'package')
    .option('--environment <environment>')
    .option('--port [port]', 'dev server port', 4300)
    .option('--firefox-profile [name|path]', 'firefox profile name or absolute path (web-ext)')
    .option('--firefox [firefox]', 'firefox path (web-ext)', 'nightly')
    .option('--firefox-keep-changes', 'keep profile changes (web-ext)')
    .option('--no-launch', 'do not launch a browser')
    .option('--include-tests', 'include tests files in build')
    .action((configPath, options) => {
      const ENVIRONMENT = process.env.CLIQZ_ENVIRONMENT || options.environment || 'development';
      const isProduction = ENVIRONMENT === 'production';
      process.env.CLIQZ_ENVIRONMENT = ENVIRONMENT;
      process.env.CLIQZ_SOURCE_MAPS = options.maps && !isProduction;
      process.env.CLIQZ_SOURCE_DEBUG = options.debug;
      process.env.CLIQZ_INCLUDE_TESTS = options.includeTests || (
        (configPath || process.env.CLIQZ_CONFIG_PATH).includes('/ci/')
          ? 'true'
          : ''
      );

      const { CONFIG, OUTPUT_PATH } = setConfigPath(configPath);

      // Enabled code linting
      process.env.CLIQZ_ESLINT = (
        (options.lint || (configPath || process.env.CLIQZ_CONFIG_PATH).includes('unit-tests.js'))
          ? 'true'
          : 'false'
      );

      let customPrefs = {};
      let server;

      try {
        customPrefs = require('../../.custom-prefs.json');
      } catch (e) {
        // .custom-prefs.json is optional so it is fine if it is missing
      }

      let addonID = '';
      if (CONFIG.platform === 'firefox') {
        addonID = CONFIG.settings.id || 'cliqz@cliqz.com';
      }

      const prefs = {
        'browser.link.open_newwindow': 3,
        'javascript.options.strict': false,
        'security.sandbox.content.level': 2,
        'extensions.legacy.enabled': true,
        'extensions.experiments.enabled': true,
        'dom.webcomponents.enabled': true,
        'dom.webcomponents.shadowdom.enabled': true,
        'lightweightThemes.selectedThemeID': 'firefox-compact-light@mozilla.org',
        'browser.tabs.warnonclose': true,
        'dom.min_background_timeout_value': 50,
        'browser.tabs.remote.autostart': true,
        'extensions.systemAddon.update.enabled': false,
        'extensions.systemAddon.update.url': '',
        'devtools.aboutdebugging.new-enabled': false,
        'devtools.storage.extensionStorage.enabled': true,
        'devtools.browserconsole.contentMessages': true,

        // Disable built-in tracking protection
        'privacy.socialtracking.block_cookies.enabled': false,
        'privacy.trackingprotection.annotate_channels': false,
        'privacy.trackingprotection.cryptomining.enabled': false,
        'privacy.trackingprotection.enabled': false,
        'privacy.trackingprotection.fingerprinting.enabled': false,
        'privacy.trackingprotection.pbmode.enabled': false,
        'network.cookie.cookieBehavior': 4, // set pref to same value as Cliqz browser
        ...customPrefs
      };

      if (options.includeTests) {
        server = spawn('node', ['./tests/test-server.js']);
        process.on('SIGTERM', () => server.kill());
      }

      const start = Date.now();

      getExtensionVersion(options.version, CONFIG).then((version) => {
        process.env.PACKAGE_VERSION = version;
        process.env.EXTENSION_VERSION = version;

        if (!process.env.VERSION) {
          process.env.VERSION = version;
        }

        let extensionRunner;
        const watcher = createBuildWatcher(OUTPUT_PATH, Number(options.port), async () => {
          try {
            if (['firefox', 'webextension'].indexOf(CONFIG.platform) >= 0
              && options.launch !== false
              && !configPath.includes('ghostery.js')
            ) {
              if (extensionRunner) {
                await extensionRunner.reloadAllExtensions();
              } else {
                const FirefoxBrowser = require('../../tests/runners/launchers/firefox-web-ext').Browser;
                const firefoxRunner = new FirefoxBrowser(prefs);
                await firefoxRunner.run({
                  configFilePath: configPath,
                  config: CONFIG,
                  outputPath: OUTPUT_PATH,
                  firefoxPath: options.firefox,
                  sourceDir: path.join(OUTPUT_PATH, addonID),
                  keepProfileChanges: options.firefoxKeepChanges || false,
                  firefoxProfile: options.firefoxProfile
                });
                extensionRunner = firefoxRunner;
              }
            }
          } catch (ex) {
            console.error(ex);
          }

          const end = Date.now();
          console.log('Build completed at: ', new Date(end));
          const ms = moment(end).diff(moment(start));
          console.log('Duration: ', moment.utc(ms).format(':mm:ss:SSS'));
          notifier.notify({
            title: 'Fern',
            message: 'Build complete',
            time: 1500
          });
        });

        watcher.on('buildFailure', (err) => {
          notifier.notify({
            title: 'Fern',
            message: `Build error - ${err}`,
            type: 'warn',
            time: 3000
          });
        });
      }).catch(console.error);
    });
};
