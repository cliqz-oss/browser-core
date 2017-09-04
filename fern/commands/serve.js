"use strict";

const program = require('commander');
const rimraf = require('rimraf');
const copyDereferenceSync = require('copy-dereference').sync
const notifier = require('node-notifier');
const webExt = require('web-ext');
const path = require('path');

const common = require('./common');
const setConfigPath = common.setConfigPath;
const buildFreshtabFrontEnd = common.buildFreshtabFrontEnd;
const getExtensionVersion = common.getExtensionVersion;
const createBuildWatcher = common.createBuildWatcher;

program.command('serve [file]')
       .option('--no-maps', 'disables source maps')
       .option('--version [version]', 'sets extension version', 'package')
       .option('--environment <environment>')
       .option('--freshtab', 'disables ember fresh-tab-frontend build')
       .option('--instrument-functions', 'enable function instrumentation for profiling')
       .option('--port [port]', 'dev server port', 4300)
       .option('--firefox-profile [name|path]', 'firefox profile name or absolute path')
       .option('--firefox [firefox]', 'firefox path', 'nightly')
       .action((configPath, options) => {
          const cfg = setConfigPath(configPath);
          const CONFIG = cfg.CONFIG;
          const OUTPUT_PATH = cfg.OUTPUT_PATH;
          process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'development';
          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;
          process.env['CLIQZ_FRESHTAB'] = options.freshtab;
          process.env['CLIQZ_INSTRUMENT_FUNCTIONS'] = options.instrumentFunctions || '';
          buildFreshtabFrontEnd();

          getExtensionVersion(options.version).then(tag => {
            process.env.EXTENSION_VERSION = tag;

            let extensionRunner;
            const watcher = createBuildWatcher(Number(options.port));

            watcher.on('buildSuccess', function () {
              let donePromise = Promise.resolve();
              rimraf.sync(OUTPUT_PATH);
              copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);

              if (CONFIG.platform === 'firefox') {
                if (extensionRunner) {
                  donePromise = extensionRunner.reloadAllExtensions()
                } else {
                  const addonID = CONFIG.settings.id || 'cliqz@cliqz.com';

                  donePromise = webExt.run({
                    noReload: true,
                    sourceDir: path.join(OUTPUT_PATH, addonID ),
                    artifactsDir: path.join(OUTPUT_PATH, addonID ),
                    firefoxProfile: options.firefoxProfile,
                    firefox: options.firefox,
                    keepProfileChanges: false,
                    customPrefs: {
                      'extensions.cliqz.showConsoleLogs': true,
                    },
                  }).then(exRunner => {
                    extensionRunner = exRunner;
                  });
                }
              }

              donePromise.then(() => {
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
