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
const loadFiles = mocha.loadFiles;
mocha.loadFiles = function () {};
mocha.run = function () {
  loadFiles.call(this, function () {
    Promise.all(
      testFiles.map(
        path => System.import(path).then(function (testModule) {
          log(`load ${path}`);
          return testModule.default;
        }).catch(function (e) {
          console.error(e)
          throw e
        })
      )
    ).then(function () {
      run.call(mocha);
    }, function (err) {
      log(`error loading tests ${err} ${err.stack}`);
      error('error loading tests', err, err.stack);
    });
  });
};


walker.on('end', function () { mocha.run(); });
