"use strict";

const program = require('commander');
const rimraf = require('rimraf');
const copyDereferenceSync = require('copy-dereference').sync
const notifier = require('node-notifier');
const webExt = require('@cliqz-oss/web-ext');
const path = require('path');
const moment = require('moment');

const common = require('./common');
const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;
const createBuildWatcher = common.createBuildWatcher;

program.command('serve [file]')
       .option('--no-maps', 'disables source maps')
       .option('--no-debug', 'disables debug pages')
       .option('--version [version]', 'sets extension version', 'package')
       .option('--environment <environment>')
       .option('--instrument-functions', 'enable function instrumentation for profiling')
       .option('--port [port]', 'dev server port', 4300)
       .option('--firefox-profile [name|path]', 'firefox profile name or absolute path (web-ext)')
       .option('--firefox [firefox]', 'firefox path (web-ext)', 'nightly')
       .option('--firefox-keep-changes', 'keep profile changes (web-ext)')
       .option('--no-launch', 'do not launch a browser')
       .option('--include-tests', 'include tests files in build')
       .action((configPath, options) => {
          process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'development';
          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;
          process.env['CLIQZ_SOURCE_DEBUG'] = options.debug;
          process.env['CLIQZ_INSTRUMENT_FUNCTIONS'] = options.instrumentFunctions || '';
          process.env['CLIQZ_INCLUDE_TESTS'] = options.includeTests || '';

          const cfg = setConfigPath(configPath);
          const CONFIG = cfg.CONFIG;
          const OUTPUT_PATH = cfg.OUTPUT_PATH;

          let customPrefs = {};

          try {
            customPrefs = require('../../.custom-prefs.json');
          } catch (e) {
            // .custom-prefs.json is optional so it is fine if it is missing
          }

          let addonID = '';
          if (CONFIG.platform === 'firefox') {
            addonID = CONFIG.settings.id || 'cliqz@cliqz.com';
          }

          const webExtOptions = {
            noReload: true,
            sourceDir: path.join(OUTPUT_PATH, addonID ),
            artifactsDir: path.join(OUTPUT_PATH, addonID ),
            firefoxProfile: options.firefoxProfile,
            firefox: options.firefox,
            keepProfileChanges: options.firefoxKeepChanges || false,
            customPrefs: Object.assign({
              'javascript.options.strict': false,
              'extensions.cliqz.showConsoleLogs': true,
              'extensions.cliqz.developer': true,
              'security.sandbox.content.level': 2,
              'extensions.legacy.enabled': true,
              'lightweightThemes.selectedThemeID': 'firefox-compact-light@mozilla.org',
            }, customPrefs),
          };
          const start = Date.now()
          const date = new Date(start)
          if (CONFIG.platform === 'firefox') {
            //console.log('web-ext options:', webExtOptions);
          }


          getExtensionVersion(options.version).then(tag => {
            process.env.EXTENSION_VERSION = tag;

            let extensionRunner;
            const watcher = createBuildWatcher(Number(options.port));

            watcher.on('buildSuccess', function () {
              let donePromise = Promise.resolve();
              rimraf.sync(OUTPUT_PATH);
              copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);

              if (['firefox', 'webextension'].indexOf(CONFIG.platform) >= 0 && options.launch !== false) {
                if (extensionRunner) {
                  donePromise = extensionRunner.reloadAllExtensions()
                } else {

                  donePromise = webExt.run(webExtOptions).then(exRunner => {
                    extensionRunner = exRunner;
                  });
                }
              }

              donePromise.then(() => {
                const end = Date.now();
                console.log('Build completed at: ', new Date(end));
                var ms = moment(end).diff(moment(start));
                console.log("Duration: ", moment.utc(ms).format(":mm:ss:SSS"))
                notifier.notify({
                  title: "Fern",
                  message: "Build complete",
                  time: 1500
                });
              }).catch(console.error);
            });

            watcher.on('buildFailure', function (err) {
              notifier.notify({
                title: "Fern",
                message: "Build error - "+err,
                type: 'warn',
                time: 3000
              });
            });

          }).catch(console.error);
       });
