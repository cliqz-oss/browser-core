/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const assert = require('assert');

const UI = require('console-ui');
const { default: { onBuildSuccess } } = require('broccoli/dist/messages');

const {
  configParameter,
  getBroccoliBuilder,
  getExtensionVersion,
  setConfigPath,
  syncBuildFolder,
} = require('../common');

module.exports = (program) => {
  program.command(`build ${configParameter}`)
    .option('--lint', 'Lint code')
    .option('--no-maps', 'disables source maps')
    .option('--no-debug', 'disables debug pages')
    .option('--version [version]', 'sets extension version', 'package')
    .option('--environment <environment>', 'the name of build environment', 'development')
    .option('--to-subdir', 'build into a subdirectory named after the config')
    .option('--include-tests', 'include tests files in build')
    .action(async (configPath, options) => {
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

      const { OUTPUT_PATH, CONFIG } = setConfigPath(configPath, options.toSubdir);

      // Enabled code linting
      process.env.CLIQZ_ESLINT = (
        (options.lint || (configPath || process.env.CLIQZ_CONFIG_PATH).includes('unit-tests.js'))
          ? 'true'
          : 'false'
      );

      assert(OUTPUT_PATH);

      console.log('Starting build');
      const version = await getExtensionVersion(options.version, CONFIG);
      process.env.PACKAGE_VERSION = version;
      process.env.EXTENSION_VERSION = version;

      if (!process.env.VERSION) {
        process.env.VERSION = version;
      }

      const builder = getBroccoliBuilder(OUTPUT_PATH);

      try {
        await builder.build();
        syncBuildFolder(builder, OUTPUT_PATH);
        onBuildSuccess(builder, new UI()); // display slow-trees
      } catch (ex) {
        console.error(ex);
        process.exit(1);
      } finally {
        await builder.cleanup();
      }

      // It seems that on fresh builds, process hangs here. Looking at upstream
      // source-code of broccoli project, they also explicitely call
      // `process.exit(0)` at the end of build. It would be nice to know why
      // this is needed though.
      process.exit(0);
    });
};
