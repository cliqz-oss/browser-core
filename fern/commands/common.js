'use strict';

const fs = require('fs');
const path = require('path');
const broccoli = require('broccoli');
const assert = require('assert');
const rimraf = require('rimraf');

let CONFIG;
let OUTPUT_PATH;

function getExtensionVersion(version) {
  return new Promise((resolve) => {
    switch (version) {
      case 'tag': {
        const git = require('git-rev');
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
}

function cleanupDefaultBuild() {
  assert(OUTPUT_PATH);
  const outDirInsideRepo = OUTPUT_PATH.indexOf(process.cwd()) === 0;
  console.log(OUTPUT_PATH, process.cwd(), outDirInsideRepo);

  if (outDirInsideRepo) {
    rimraf.sync(OUTPUT_PATH);
  } else if (fs.existsSync(OUTPUT_PATH)) {
    throw new Error("Won't remove output directory because it's outside of the repo.");
  }
}

function setConfigPath(configPath, buildIntoSubdir) {
  const _configPath = configPath || process.env.CLIQZ_CONFIG_PATH;
  process.env.CLIQZ_CONFIG_PATH = _configPath;
  CONFIG = require(path.resolve(_configPath));

  let defaultBuildDir = path.resolve(process.cwd(), 'build');
  if (buildIntoSubdir) {
    defaultBuildDir = path.join(defaultBuildDir, path.parse(_configPath).name);
  }
  OUTPUT_PATH = ('CLIQZ_OUTPUT_PATH' in process.env) ?
    path.resolve(process.env.CLIQZ_OUTPUT_PATH) :
    defaultBuildDir;

  return {
    CONFIG,
    OUTPUT_PATH
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
  const server = broccoli.server.serve(watcher, '0.0.0.0', port || 4300);

  return server.watcher;
}

const configParameter = process.env.CLIQZ_CONFIG_PATH
  ? '[configFile]'
  : '<configFile>';

module.exports = {
  createBuildWatcher,
  getExtensionVersion,
  setConfigPath,
  cleanupDefaultBuild,
  configParameter,
};
