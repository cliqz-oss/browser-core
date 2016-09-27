"use strict"
const walk = require('walk');
const System = require('systemjs');
const Mocha = require('mocha');
const fs = require('fs');
const chai = require('../bower_components/chai/chai.js');
chai.config.truncateThreshold = 0

global.chai = chai;

const configFilePath  = process.env['CLIQZ_CONFIG_PATH'];
const cliqzConfig = JSON.parse(fs.readFileSync(configFilePath));

const mocha = new Mocha({
  ui: 'bdd',
  reporter: 'tap'
});

const baseDir = cliqzConfig.testsBasePath;

System.config({
  defaultJSExtensions: true,
  baseURL: baseDir,
  meta: {
    '*': { format: 'register' }
  }
});

// list names of all loaded modules so we can unload them after each test
// check `unloadModules`
let set = System.set;
let modules = {};
System.set = function (name) {
  modules[name] = true;
  return set.apply(System, arguments);
};

const testFiles = [];
const walker = walk.walk(baseDir);

walker.on('file', function (root, state, next) {
  const testPath = root + '/' + state.name;
  if (state.name.endsWith('-test.js')) {
    testFiles.push(testPath);
    mocha.addFile(testPath);
  }
  next();
});

function describeModule(moduleName, loadDeps, testFn) {
  var deps;

  function loadModules() {
    return Promise.all(
      Object.keys(deps).map(
        dep => System.set(dep, System.newModule(deps[dep]))
      )
    ).then(function () {
      return System.import(moduleName);
    });
  }

  function unloadModules() {

    System.delete(System.normalizeSync(moduleName));
    Object.keys(deps).forEach( mod => {
      return System.delete(mod)
    });

    // Unload remaining unmocked modules
    Object.keys(modules).forEach(name => {
      const normalizedName = System.normalizeSync(name);
      System.delete(normalizedName);
    });
  }

  return new Promise(function (resolve) {

    describe(moduleName, function () {

      before(function () {
      });

      after(function () {
      });

      beforeEach(function () {
        deps = loadDeps();

        return loadModules().then( (mod) => {
          this.module = function module() {
            module.module = module.module || mod;
            return module.module;
          };
          this.deps = function dependencies(name) {
            dependencies.dependencies = dependencies.dependencies || deps;
            return dependencies.dependencies[name];
          };
        });
      });

      afterEach(function () {
        unloadModules();
        deps = {};
      });

      testFn.call(this);
      resolve();
    });
  });
}

global.describeModule = describeModule;

var run = mocha.run;
var loadFiles = mocha.loadFiles;
mocha.loadFiles = function () {};
mocha.run = function () {
  loadFiles.call(this, function () {
    Promise.all(
      testFiles.map(
        path => System.import(path).then(function (testModule) {
          return testModule.default
        })
      )
    ).then( function () {
      run.call(mocha);
    }, function (err) {
      console.error('error loading tests', err, err.stack);
    });
  });
}

walker.on('end', function () {
  mocha.run();
});
