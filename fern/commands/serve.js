'use strict';

const program = require('commander');
const rimraf = require('rimraf');
const copyDereferenceSync = require('copy-dereference').sync;
const notifier = require('node-notifier');
const path = require('path');
const moment = require('moment');
const spawn = require('child_process').spawn;
const common = require('./common');

const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;
const createBuildWatcher = common.createBuildWatcher;

program.command(`serve ${common.configParameter}`)
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
  .option('--v6', 'include fast v6 build - v-shaped 6 cylinder engine')
  .action((configPath, options) => {
    process.env.CLIQZ_ENVIRONMENT = options.environment || 'development';
    process.env.CLIQZ_SOURCE_MAPS = options.maps;
    process.env.CLIQZ_SOURCE_DEBUG = options.debug;
    process.env.CLIQZ_INCLUDE_TESTS = options.includeTests || '';
    process.env.CLIQZ_V6_BUILD = options.v6 || '';

    const cfg = setConfigPath(configPath);
    const CONFIG = cfg.CONFIG;
    const OUTPUT_PATH = cfg.OUTPUT_PATH;

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

    const prefs = Object.assign({
      'browser.link.open_newwindow': 3,
      'javascript.options.strict': false,
      'extensions.cliqz.showConsoleLogs': true,
      'extensions.cliqz.developer': true,
      'security.sandbox.content.level': 2,
      'extensions.legacy.enabled': true,
      'dom.webcomponents.enabled': true,
      'dom.webcomponents.shadowdom.enabled': true,
      'lightweightThemes.selectedThemeID': 'firefox-compact-light@mozilla.org',
      'browser.tabs.warnonclose': true,
      'dom.min_background_timeout_value': 50,
      'browser.tabs.remote.autostart': true,
    }, customPrefs);

    if (options.includeTests) {
      prefs['extensions.cliqz.browserOnboarding'] = true;
      prefs['extensions.cliqz.freshtab.tooltip.enabled'] = true;
      server = spawn('node', ['./tests/test-server.js']);
      process.on('SIGTERM', () => server.kill());
    }

    const start = Date.now();

    getExtensionVersion(options.version).then((version) => {
      process.env.PACKAGE_VERSION = version;
      process.env.EXTENSION_VERSION = version;

      if (!process.env.VERSION) {
        process.env.VERSION = version;
      }

      let extensionRunner;
      const watcher = createBuildWatcher(Number(options.port));

      watcher.on('buildSuccess', () => {
        let donePromise = Promise.resolve();
        rimraf.sync(OUTPUT_PATH);
        copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);
        if (['firefox', 'webextension'].indexOf(CONFIG.platform) >= 0
          && options.launch !== false
          && !configPath.includes('ghostery.js')
        ) {
          if (extensionRunner) {
            donePromise = extensionRunner.reloadAllExtensions();
          } else {
            const FirefoxBrowser = require('../../tests/runners/launchers/firefox-web-ext').Browser;
            const firefoxRunner = new FirefoxBrowser(prefs);
            donePromise = firefoxRunner.run({
              configFilePath: configPath,
              config: cfg,
              outputPath: OUTPUT_PATH,
              firefoxPath: options.firefox,
              sourceDir: path.join(OUTPUT_PATH, addonID),
              keepProfileChanges: options.firefoxKeepChanges || false,
              firefoxProfile: options.firefoxProfile
            }).then(() => {
              extensionRunner = firefoxRunner;
            });
          }
        }

        donePromise.then(() => {
          const end = Date.now();
          console.log('Build completed at: ', new Date(end));
          const ms = moment(end).diff(moment(start));
          console.log('Duration: ', moment.utc(ms).format(':mm:ss:SSS'));
          notifier.notify({
            title: 'Fern',
            message: 'Build complete',
            time: 1500
          });
        }).catch(console.error);
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
