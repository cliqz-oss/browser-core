'use strict';

/* globals require, process, global, error */

const walk = require('walk');
const System = require('systemjs');
const Mocha = require('mocha');
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const sinonAsPromised = require('sinon-as-promised');
const path = require('path');
chai.config.truncateThreshold = 0
chai.use(chaiAsPromised);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;

function log(msg) {
  fs.appendFileSync('./mocha.log', `${msg}\n`);
}


const configFilePath = process.env.CLIQZ_CONFIG_PATH;
const cliqzConfig = JSON.parse(fs.readFileSync(configFilePath));

log(JSON.stringify(cliqzConfig));

const mochaOptions = {
  ui: 'bdd',
  reporter: 'tap',
};
const grep = process.env["MOCHA_GREP"];
const fgrep = process.env["MOCHA_FGREP"];
if (grep) {
  mochaOptions.grep = grep;
}
const mocha = new Mocha(mochaOptions);
const baseDir = cliqzConfig.testsBasePath;

log(`baseDir ${baseDir}`);

const baseURL = baseDir + (cliqzConfig.platform === 'mobile' ? '/dev' : '');

System.config({
  defaultJSExtensions: true,
  baseURL,
  meta: {
    '*': { format: 'register' },
  },
});

// list names of all loaded modules so we can unload them after each test
// check `unloadModules`
const set = System.set;
const modules = {};
System.set = function (name) {
  modules[name] = true;
  return set.apply(System, arguments);
};

const testFiles = [];
const walker = walk.walk(baseDir);

walker.on('file', (root, state, next) => {
  const testPath = `${root}/${state.name}`;
  if (state.name.endsWith('-test.js')) {
    if (fgrep && testPath.indexOf(fgrep) < 0) {
      next();
      return;
    }
    testFiles.push(testPath);
    mocha.addFile(testPath);
  }
  next();
});

function describeModule(moduleName, loadDeps, testFn) {
  let deps;

  function loadModules() {
    const depsRewrite = Object.assign(Object.create(null), deps);
    Object.keys(deps).forEach(dep => {
      Object.keys(deps[dep]).forEach(key => {
        if (deps[dep][key] === '[dynamic]') {
          depsRewrite[dep][key] = function () {
            // TODO: add support for constuctor prototype
            return deps[dep][key].apply(this, arguments);
          }
        }
      });
    });

    return Promise.all(
      Object.keys(depsRewrite).map(
        dep => {
          let depName;
          // Handle relative imports
          if (dep.startsWith('.')) {
            depName = System.normalizeSync(dep, moduleName);
          } else {
            depName = dep;
          }
          System.set(System.normalizeSync(depName), System.newModule(depsRewrite[dep]))
        }
      )
    ).then(() => System.import(moduleName));
  }

  function unloadModules() {
    System.delete(System.normalizeSync(moduleName));
    Object.keys(deps).forEach(mod => System.delete(mod));

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

        return loadModules().then(mod => {
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

const run = mocha.run;
mocha.loadFiles = function () {};
mocha.run = function () {
  /* mocha.loadFiles supporting async loading */
  const self = this;
  const suite = this.suite;
  const promises = this.files.map(function (file) {
    console.log(file)
    file = path.resolve(file);
    suite.emit('pre-require', global, file, self);
    return System.import(file).then(module => {
      suite.emit('require', module, file, self);
      suite.emit('post-require', global, file, self);
    }).catch((error) => {
      // TODO: handle the error here by adding failing test result for this file
      throw error;
    });
  });
  /* mocha.loadFiles end */

  Promise.all(promises).then(function () {
    run.call(mocha);
  }, function (err) {
    log(`error loading tests ${err} ${err.stack}`);
    console.error('error loading tests', err, err.stack);
  });
};

walker.on('end', function () { mocha.run(); });
