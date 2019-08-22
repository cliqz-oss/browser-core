/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use strict';

const assert = require('assert');
const broccoli = require('broccoli');
const copyDereferenceSync = require('copy-dereference').sync;
const printSlowNodes = require('broccoli-slow-trees');
const program = require('commander');

const common = require('./common');

const setConfigPath = common.setConfigPath;
const cleanupDefaultBuild = common.cleanupDefaultBuild;
const getExtensionVersion = common.getExtensionVersion;

program.command(`build ${common.configParameter}`)
  .option('--lint', 'Lint code')
  .option('--no-maps', 'disables source maps')
  .option('--no-debug', 'disables debug pages')
  .option('--version [version]', 'sets extension version', 'package')
  .option('--environment <environment>', 'the name of build environment', 'development')
  .option('--to-subdir', 'build into a subdirectory named after the config')
  .option('--include-tests', 'include tests files in build')
  .action((configPath, options) => {
    process.env.CLIQZ_ENVIRONMENT = process.env.CLIQZ_ENVIRONMENT || options.environment;
    process.env.CLIQZ_SOURCE_MAPS = options.maps;
    process.env.CLIQZ_SOURCE_DEBUG = options.debug;
    process.env.CLIQZ_INCLUDE_TESTS = options.includeTests || (
      (configPath || process.env.CLIQZ_CONFIG_PATH).includes('/ci/')
        ? 'true'
        : ''
    );

    const cfg = setConfigPath(configPath, options.toSubdir);
    const OUTPUT_PATH = cfg.OUTPUT_PATH;

    // Enabled code linting
    process.env.CLIQZ_ESLINT = (
      (options.lint || (configPath || process.env.CLIQZ_CONFIG_PATH).includes('unit-tests.js'))
        ? 'true'
        : 'false'
    );

    assert(OUTPUT_PATH);

    const buildStartAt = Date.now();

    console.log('Starting build');

    cleanupDefaultBuild();

    getExtensionVersion(options.version).then((version) => {
      process.env.PACKAGE_VERSION = version;
      process.env.EXTENSION_VERSION = version;

      if (!process.env.VERSION) {
        process.env.VERSION = version;
      }

      const node = broccoli.loadBrocfile();
      const builder = new broccoli.Builder(node, {
        outputDir: OUTPUT_PATH
      });

      return builder
        .build()
        .then(() => {
          copyDereferenceSync(builder.outputPath, OUTPUT_PATH);
          printSlowNodes(builder.outputNodeWrapper, 0);
          // builder.cleanup();
          console.log('Build successful - took ', (Date.now() - buildStartAt) / 1000, 's');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Build error', err);
          process.exit(1);
        });
    }).catch(e => console.log(e));
  });
