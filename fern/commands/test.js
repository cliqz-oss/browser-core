"use strict";

const program = require('commander');
const untildify = require('untildify');
const rimraf = require('rimraf');
const Testem = require('testem');
const path = require('path');
const copyDereferenceSync = require('copy-dereference').sync
const notifier = require('node-notifier');

const Reporter = require('../reporter');
const common = require('./common');
const getExtensionVersion = common.getExtensionVersion;
const setConfigPath = common.setConfigPath;
const createBuildWatcher = common.createBuildWatcher;

program.command('test [file]')
  .option('--ci [output]', 'Starts Testem in CI mode')
  .option('--grep [pattern]', 'only run tests matching <pattern>')
  .option('--fgrep [pattern]', 'only run tests with file names matching <pattern>')
  .option('--environment <environment>')
  .option('--firefox [firefox]', 'firefox path', 'nightly')
  .option('--no-build', 'skip the build, run tests only')
  .option('-l --launchers [launchers]', 'comma separted list of launchers')
  .action( (configPath, options) => {
    process.env['CLIQZ_ENVIRONMENT'] = options.environment || 'testing';
    const cfg = setConfigPath(configPath);
    const CONFIG = cfg.CONFIG;
    const OUTPUT_PATH = cfg.OUTPUT_PATH;
    let watcher;

    if (options.grep) {
      process.env["MOCHA_GREP"] = options.grep;
    }

    if (options.fgrep) {
      process.env["MOCHA_FGREP"] = options.fgrep;
    }

    if (options.firefox) {
      process.env["FIREFOX_PATH"] = untildify(options.firefox);
    }

    process.env["OUTPUT_PATH"] = untildify(OUTPUT_PATH);

    const testem = new Testem();
    const launchers = options.launchers;
    const serveFiles = [];

    if (CONFIG.testsBasePath) {
      serveFiles.push(
        path.resolve(process.cwd(), CONFIG.testsBasePath, 'core', 'content-tests.bundle.js')
      );
    }

    let isRunning = false;

    getExtensionVersion('package').then(tag => {
      process.env.EXTENSION_VERSION = tag;

      if (options.ci) {
        const run = () => {
          const ciOptions =  {
            debug: true,
            host: 'localhost',
            port: '4200',
            launch: launchers || (CONFIG['testem_launchers_ci'] || []).join(','),
            reporter: Reporter,
            serve_files: serveFiles,
          };

          if (typeof options.ci === 'string') {
            ciOptions.report_file = options.ci;
          }
          testem.startCI(ciOptions);
        };

        if (options.build) {
          watcher = createBuildWatcher();
          watcher.on('buildSuccess', function() {
            rimraf.sync(OUTPUT_PATH);
            copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);
            run();
          });
        } else {
          run();
        }
      } else {
        let server;
        watcher = createBuildWatcher();
        watcher.on('buildSuccess', function() {
          try {
            rimraf.sync(OUTPUT_PATH);
            copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);
            notifier.notify({
              title: "Fern",
              message: "Build complete",
              time: 1500
            });

            if (!isRunning) {
              testem.startDev({
                debug: true,
                host: 'localhost',
                port: '4200',
                launch: launchers || (CONFIG['testem_launchers'] || []).join(','),
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
        });

      }

      if (!watcher) {
        return;
      }

      watcher.on('buildFailure', function (err) {
        const msg = "Build error - "+err;
        console.error(msg);
        notifier.notify({
          title: "Fern",
          message: msg,
          type: 'warn',
          time: 3000
        });
      });
    });
  });
