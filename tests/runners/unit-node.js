/* eslint-disable func-names, prefer-arrow-callback, prefer-rest-params, strict */
/* globals require, process, global */

'use strict';

const glob = require('glob');
const path = require('path');
const systemjs = require('systemjs');
const Mocha = require('mocha');
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');


chai.config.truncateThreshold = 0;
chai.use(chaiAsPromised);
chai.use(sinonChai);


function log(msg) {
  fs.appendFileSync('./mocha.log', `${msg}\n`);
}


const configFilePath = process.env.CLIQZ_CONFIG_PATH;
const cliqzConfig = require(path.resolve(configFilePath));

log(JSON.stringify(cliqzConfig));

const mochaOptions = {
  ui: 'bdd',
  reporter: 'tap',
};
const grep = process.env.MOCHA_GREP;
const fgrep = process.env.MOCHA_FGREP;
if (grep) {
  mochaOptions.grep = grep;
}
const mocha = new Mocha(mochaOptions);
const baseDir = cliqzConfig.testsBasePath || './build';

log(`baseDir ${baseDir}`);

const baseURL = baseDir + (cliqzConfig.platform === 'mobile' ? '/dev' : '');

const testFiles = [];

[]
  .concat(glob.sync(`${baseDir}/**/tests/**/unit/**/*-test.js`))
  .concat(glob.sync(`${baseDir}/**/tests/**/*lint-test.js`))
  .forEach(function (path) {
    if (fgrep && path.indexOf(fgrep) === -1) {
      return;
    }

    testFiles.push(path);
    mocha.addFile(path);
  });

// Instead of having to load all mocks manually in unit tests, we provide all
// the libraries declared in `dependencies` from package.json as global mocks
// automatically. This allows to simplify mocking from tests.
//
// eslint-disable-next-line global-require, import/no-dynamic-require
const { dependencies } = require(path.join(__dirname, '..', '..', 'package.json'));
const defaultMocks = {};
for (const dep of Object.keys(dependencies)) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(dep);
    defaultMocks[dep] = typeof mod === 'object' ? mod : { default: mod };
  } catch (ex) {
    // ignore
  }
}

function describeModule(moduleName, loadDeps, testFn) {
  const localSystem = new systemjs.constructor();
  localSystem.config({
    defaultJSExtensions: true,
    baseURL,
    meta: {
      '*': { format: cliqzConfig.format === 'common' ? 'cjs' : 'register' },
    },
  });

  // list names of all loaded modules so we can unload them after each test
  // check `unloadModules`
  const systemSet = localSystem.set;
  const systemImport = localSystem.import;

  let modules = {};

  localSystem.set = function (name) {
    modules[name] = true;
    return systemSet.apply(localSystem, arguments);
  };

  localSystem.import = function (name) {
    modules[name] = true;
    modules[localSystem.normalizeSync(name)] = true;
    return systemImport.apply(localSystem, arguments);
  };

  let deps;

  function loadModules() {
    const depsRewrite = Object.assign(Object.create(null), deps);
    Object.keys(deps).forEach(function (dep) {
      if (cliqzConfig.format === 'common') {
        deps[dep].__esModule = true;
      }
      Object.keys(deps[dep]).forEach(function (key) {
        if (deps[dep][key] === '[dynamic]') {
          depsRewrite[dep][key] = function () {
            // TODO: add support for constructor prototype
            return deps[dep][key].apply(this, arguments);
          };
        }
      });
    });

    return Promise.all(
      Object.keys(depsRewrite).map(
        function (dep) {
          let depName;
          // Handle relative imports
          if (dep.startsWith('.')) {
            const base = localSystem.normalizeSync(moduleName, baseURL);
            depName = localSystem.normalizeSync(dep, base);
          } else {
            depName = dep;
          }

          return localSystem.set(
            localSystem.normalizeSync(depName),
            localSystem.newModule(depsRewrite[dep])
          );
        }
      )
    ).then(() => localSystem.import(moduleName));
  }

  function unloadModules() {
    // Unload remaining unmocked modules
    Object.keys(modules).forEach(function (name) {
      if (modules[name] === true) {
        modules[name] = false;
        localSystem.delete(name);
      }
    });
  }

  return new Promise(function (resolve /* , reject */) {
    describe(moduleName, function () {
      beforeEach(function () {
        deps = {
          ...defaultMocks,
          ...loadDeps(),
        };

        return loadModules(deps).then((mod) => {
          this.system = localSystem;
          this.module = function module() {
            module.module = module.module || mod;
            return module.module;
          };
          this.deps = function dependencies(name) {
            dependencies.dependencies = dependencies.dependencies || deps;
            return dependencies.dependencies[name];
          };
          this.fixtureDir = function () {
            const moduleBase = moduleName.split('/')[0];
            return 'build/tests/tests/' + moduleBase + '/tests/unit/dist';
          };
        });
      });

      afterEach(function () {
        unloadModules();
        deps = {};
        modules = {};
      });

      try {
        testFn.call(this);
      } catch (e) {
        it('unexpected error', function () {
          throw e;
        });
      }
      resolve();
    });
  });
}

// ////////////////////////////////////////////
// Define globals accessible from test modules
// ////////////////////////////////////////////

// Mock global System to import tests
global.System = {
  register() {
    const module = arguments[arguments.length - 1](() => {});
    module.execute();
  }
};

global.describeModule = describeModule;
global.chai = chai;
global.sinon = sinon;

mocha.run();
