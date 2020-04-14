/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const path = require('path');
const broccoli = require('broccoli');
const UI = require('console-ui');
const TreeSync = require('tree-sync');
const WatchDetector = require('watch-detector');
const git = require('git-rev');
const childProcess = require('child_process');
const { gitDescribeSync } = require('git-describe');

let CONFIG;
let OUTPUT_PATH;

async function getExtensionVersion(version, config) {
  const prefix = config.versionPrefix;
  const distance = config.versionDistance;
  const ver = await new Promise((resolve) => {
    switch (version) {
      case 'tag': {
        git.tag(resolve);
        break;
      }
      case 'package':
        fs.readFile('package.json', (err, data) => resolve(JSON.parse(data).version));
        break;
      default:
        resolve(version);
    }
  });
  const versionParts = ver.split('.');
  if (prefix) {
    versionParts[0] = prefix;
  }

  if (distance) {
    const gitInfo = gitDescribeSync();
    versionParts.push(gitInfo.distance || 0);
  }
  return versionParts.join('.');
}

function setConfigPath(configPath, buildIntoSubdir) {
  const _configPath = configPath || process.env.CLIQZ_CONFIG_PATH;
  process.env.CLIQZ_CONFIG_PATH = _configPath;
  // eslint-disable-next-line global-require, import/no-dynamic-require
  CONFIG = require(path.resolve(_configPath));

  let defaultBuildDir = path.resolve(process.cwd(), 'build');
  if (buildIntoSubdir) {
    defaultBuildDir = path.join(defaultBuildDir, path.parse(_configPath).name);
  }
  OUTPUT_PATH = ('CLIQZ_OUTPUT_PATH' in process.env)
    ? path.resolve(process.env.CLIQZ_OUTPUT_PATH)
    : defaultBuildDir;

  return {
    CONFIG,
    OUTPUT_PATH
  };
}

function getConfig() {
  return CONFIG;
}

function getOutputPath() {
  return OUTPUT_PATH;
}

/**
 * Create `broccoli.Builder` instance based on Brocfile.js found in current directory.
 */
function getBroccoliBuilder(outputDir) {
  const brocfile = broccoli.loadBrocfile();
  return new broccoli.Builder(brocfile({}), {
    outputDir,
  });
}

function buildWatcherOptions(ui) {
  const detector = new WatchDetector({
    ui,
    fs,
    root: process.cwd(),
    childProcess,
  });

  const watchPreference = detector.findBestWatcherOption({
    watcher: 'watchman',
  });
  const watcher = watchPreference.watcher;

  return {
    saneOptions: {
      poll: watcher === 'polling',
      watchman: watcher === 'watchman',
      node: watcher === 'node' || !watcher,
    },
  };
}

function getBroccoliWatcher(outputDir, builder, ui) {
  return new broccoli.Watcher(
    builder,
    builder.watchedSourceNodeWrappers,
    buildWatcherOptions(ui),
  );
}

function syncBuildFolder(builder, outputDir) {
  (new TreeSync(builder.outputPath, outputDir)).sync();
}

function createBuildWatcher(outputDir, port, onSuccess) {
  const ui = new UI();
  const builder = getBroccoliBuilder(outputDir);
  const watcher = getBroccoliWatcher(outputDir, builder, ui);

  // Make sure we clean-up on exit
  function cleanupAndExit() {
    return watcher.quit();
  }

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);

  // Sync build directory on build success
  watcher.on('buildSuccess', () => {
    syncBuildFolder(builder, outputDir);
    onSuccess();
  });

  // Start serving!
  broccoli.server.serve(
    watcher,
    '127.0.0.1',
    port || 4300,
    undefined,
    undefined,
    new UI(),
  );

  return watcher;
}

const configParameter = process.env.CLIQZ_CONFIG_PATH
  ? '[configFile]'
  : '<configFile>';

module.exports = {
  configParameter,
  createBuildWatcher,
  getBroccoliBuilder,
  getConfig,
  getExtensionVersion,
  getOutputPath,
  setConfigPath,
  syncBuildFolder,
};
