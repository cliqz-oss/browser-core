/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const path = require('path');

const untildify = require('untildify');
const Testem = require('testem');
const notifier = require('node-notifier');

const Reporter = require('../reporter');
const {
  configParameter,
  createBuildWatcher,
  getExtensionVersion,
  setConfigPath,
} = require('../common');

module.exports = (program) => {
  program.command(`test ${configParameter}`)
    .option('--lint', 'Lint code')
    .option('--ci [output]', 'Starts Testem in CI mode')
    .option('--keep-open', 'do not close the browser after tests')
    .option('--grep [pattern]', 'only run tests matching <pattern>')
    .option('--fgrep [pattern]', 'only run tests with file names matching <pattern>')
    .option('--environment <environment>')
    .option('--port [port]', 'dev server port', 4300)
    .option('--firefox [firefox]', 'firefox path', 'nightly')
    .option('--no-build', 'skip the build, run tests only')
    .option('-l --launchers [launchers]', 'comma separted list of launchers')
    .option('--extension-log [output]', 'save extension logger messages to the file. When using with `run_tests_in_docker.sh`, the file should be in the directory `report`.')
    .action((configPath, options) => {
      process.env.CLIQZ_ENVIRONMENT = process.env.CLIQZ_ENVIRONMENT || options.environment || 'development';
      process.env.CLIQZ_INCLUDE_TESTS = 'true';
      const cfg = setConfigPath(configPath);
      const CONFIG = cfg.CONFIG;
      const OUTPUT_PATH = cfg.OUTPUT_PATH;
      let watcher;

      // Enabled code linting
      process.env.CLIQZ_ESLINT = (
        (options.lint || (configPath || process.env.CLIQZ_CONFIG_PATH).includes('unit-tests.js'))
          ? 'true'
          : 'false'
      );

      if (options.grep) {
        process.env.MOCHA_GREP = options.grep;
      }

      if (options.fgrep) {
        process.env.MOCHA_FGREP = options.fgrep;
      }

      if (options.firefox) {
        process.env.FIREFOX_PATH = untildify(options.firefox);
      }

      if (options.keepOpen) {
        process.env.KEEP_OPEN = 'true';
      }

      if (options.extensionLog) {
        process.env.EXTENSION_LOG = options.extensionLog;
      }

      process.env.OUTPUT_PATH = untildify(OUTPUT_PATH);

      process.env.AUTOSTART = 'true';

      const testem = new Testem();
      const launchers = options.launchers;
      const serveFiles = [];

      if (CONFIG.testsBasePath) {
        serveFiles.push(
          path.resolve(process.cwd(), CONFIG.testsBasePath, 'core', 'content-tests.bundle.js')
        );
      }

      let isRunning = false;

      getExtensionVersion('package', CONFIG).then((version) => {
        process.env.PACKAGE_VERSION = version;
        process.env.EXTENSION_VERSION = version;

        if (!process.env.VERSION) {
          process.env.VERSION = version;
        }

        if (options.ci) {
          const run = () => {
            const ciOptions = {
              debug: true,
              host: 'localhost',
              port: '4200',
              launch: launchers || (CONFIG.testem_launchers_ci || []).join(','),
              reporter: Reporter,
              serve_files: serveFiles,
            };

            if (typeof options.ci === 'string') {
              ciOptions.report_file = options.ci;
            }
            testem.startCI(ciOptions);
          };

          if (options.build) {
            watcher = createBuildWatcher(
              OUTPUT_PATH,
              Number(options.port),
              run,
            );
          } else {
            run();
          }
        } else {
          watcher = createBuildWatcher(
            OUTPUT_PATH,
            Number(options.port),
            () => {
              try {
                notifier.notify({
                  title: 'Fern',
                  message: 'Build complete',
                  time: 1500
                });

                if (!isRunning) {
                  testem.startDev({
                    debug: true,
                    query_params: options.grep ? { grep: options.grep } : undefined,
                    host: 'localhost',
                    port: '4200',
                    launch: launchers || (CONFIG.testem_launchers || []).join(','),
                    reporter: Reporter,
                    report_file: options.ci,
                    serve_files: serveFiles,
                  });

                  isRunning = true;
                } else {
                  testem.restart();
                }
              } catch (e) {
                console.error('Tests error:', e);
              }
            },
          );
        }

        if (!watcher) {
          return;
        }

        watcher.on('buildFailure', (err) => {
          const msg = `Build error - ${err}`;
          console.error(msg);
          notifier.notify({
            title: 'Fern',
            message: msg,
            type: 'warn',
            time: 3000
          });
        });
      });
    });
};
