"use strict";

const fs = require('fs');
const path = require('path');
const broccoli = require('broccoli');
const assert = require('assert');
const rimraf = require('rimraf');
const chalk = require('chalk');

let CONFIG;
let OUTPUT_PATH;

function getExtensionVersion(version) {
  return new Promise(resolve => {
    switch (version) {
      case 'tag':
        const git = require('git-rev');
        git.tag(resolve);
        break;
      case 'package':
        fs.readFile('package.json', (err, data) => resolve(JSON.parse(data).version));
        break;
      default:
        resolve(version);
    }
  });
}

function cleanupDefaultBuild() {
  assert(OUTPUT_PATH);
  const outDirInsideRepo = OUTPUT_PATH.indexOf(process.cwd()) === 0;
  console.log(OUTPUT_PATH, process.cwd(), outDirInsideRepo);

  if (outDirInsideRepo) {
    rimraf.sync(OUTPUT_PATH);
  } else if(fs.existsSync(OUTPUT_PATH)) {
    throw new Error("Won't remove output directory because it's outside of the repo.");
  }
}

function setConfigPath(configPath, buildIntoSubdir) {
  configPath = configPath || process.env['CLIQZ_CONFIG_PATH'] || './configs/ci/browser.js'
  process.env['CLIQZ_CONFIG_PATH'] = configPath;
  CONFIG = require(path.resolve(configPath));
  CONFIG.subprojects = CONFIG.subprojects || [];

  const configName = path.basename(configPath);
  let defaultBuildDir = path.resolve(process.cwd(), 'build');
  if (buildIntoSubdir)
      defaultBuildDir = path.join(defaultBuildDir, path.parse(configPath).name);
  OUTPUT_PATH = ('CLIQZ_OUTPUT_PATH' in process.env) ?
      path.resolve(process.env.CLIQZ_OUTPUT_PATH) :
      defaultBuildDir;

  return {
    CONFIG: CONFIG,
    OUTPUT_PATH: OUTPUT_PATH
  };
}

function createBuildWatcher(port) {
  cleanupDefaultBuild();
  const node = broccoli.loadBrocfile();
  const builder = new broccoli.Builder(node, {
    outputDir: OUTPUT_PATH
  });

  const watcher = new broccoli.Watcher(builder);

  // maybe we can run watcher without server
  // but then we will have to copy build artifacts to 'output' folder
  const server = broccoli.server.serve(watcher, 'localhost', port || 4300);

  return server.watcher;
}

module.exports = {
  createBuildWatcher: createBuildWatcher,
  getExtensionVersion: getExtensionVersion,
  setConfigPath: setConfigPath,
  cleanupDefaultBuild: cleanupDefaultBuild,
};
