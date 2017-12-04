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
const setConfigPath = common.setConfigPath;
const createBuildWatcher = common.createBuildWatcher;

program.command('test [file]')
  .option('--ci [output]', 'Starts Testem in CI mode')
  .option('--grep [pattern]', 'only run tests matching <pattern>')
  .option('--fgrep [pattern]', 'only run tests with file names matching <pattern>')
  .option('--firefox [firefox]', 'firefox path', 'nightly')
  .option('-l --launchers [launchers]', 'comma separted list of launchers')
  .action( (configPath, options) => {
    const cfg = setConfigPath(configPath);
    const CONFIG = cfg.CONFIG;
    const OUTPUT_PATH = cfg.OUTPUT_PATH;
    const watcher = createBuildWatcher();

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

    if (options.ci) {
      watcher.on('buildSuccess', function() {
        rimraf.sync(OUTPUT_PATH);
        copyDereferenceSync(watcher.builder.outputPath, OUTPUT_PATH);

        testem.startCI({
          debug: true,
          host: 'localhost',
          port: '4200',
          launch: launchers || (CONFIG['testem_launchers_ci'] || []).join(','),
          reporter: Reporter,
          report_file: options.ci,
          serve_files: serveFiles,
        });
      });
    } else {
      let server;
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
