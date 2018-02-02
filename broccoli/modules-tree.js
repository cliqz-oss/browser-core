"use strict";
var fs = require('fs');
var path = require('path');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var Babel = require('broccoli-babel-transpiler');
var ESLint = require('broccoli-lint-eslint');
var broccoliSource = require('broccoli-source');
var watchify = require('broccoli-watchify');
var WatchedDir = broccoliSource.WatchedDir;
const writeFile = require('broccoli-file-creator');
var env = require('./cliqz-env');

var cliqzConfig = require('./config');
const modulesList = require('./modules/modules-list');
const contentScriptsImport = require('./modules/content-script-imports');
const contentTestsImport = require('./modules/content-tests-imports');

var Instrument = require('./instrument');
var helpers = require('./modules/helpers');
var getBundlesTree = require('./modules/bundles-tree');
var getHandlebarsTree = require('./modules/handlebars-tree');
var getSassTree = require('./modules/sass-tree');
var getDistTree = require('./modules/dist-tree');

var walk = helpers.walk;

const modulesTree = new WatchedDir('modules');

let babelModulePlugin;

if (cliqzConfig.format === 'common') {
  babelModulePlugin = 'transform-es2015-modules-commonjs';
}

if (cliqzConfig.format === 'system') {
  babelModulePlugin = 'transform-es2015-modules-systemjs';
}

const babelOptions = {
  babelrc: false,
  presets: [
    ['env', {
      targets: {
        firefox: 52
      },
      modules: false,
      exclude: [
        'transform-async-to-generator',
        'transform-es2015-template-literals',
        'transform-regenerator'
      ]
    }],
  ],
  compact: false,
  sourceMaps: false,
  filterExtensions: ['es', 'jsx'],
  plugins: [
    'transform-class-properties',
    'transform-exponentiation-operator',
    'transform-object-rest-spread',
    'transform-react-jsx',
  ].concat(cliqzConfig.babelPlugins || []).concat(babelModulePlugin || []),
};

if (cliqzConfig.instrumentFunctions) {
  // TODO: make sure this works
  babelOptions.plugins.push(Instrument);
}

const eslintOptions = {
  configFile: process.cwd() + '/.eslintrc',
};


function getPlatformFunnel() {
  return new Funnel(new WatchedDir('platforms/'), {
    exclude: ['**/tests/**/*', '**/*.browserify'],
  });
}


function getPlatformTree() {
  let platform = getPlatformFunnel();

  platform = Babel(platform, Object.assign({}, babelOptions));

  return new Funnel(platform, {
    srcDir: cliqzConfig.platform,
    destDir: 'platform',
  });
}

function getSourceFunnel() {
  return new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/sources/**/*.es`).concat(cliqzConfig.modules.map(name => `${name}/sources/**/*.jsx`)),
    exclude: cliqzConfig.modules.map(name => `${name}/sources/**/*.browserify`),
    getDestinationPath(path) {
      return path.replace('/sources', '');
    }
  });
}

function testGenerator(relativePath, errors, extra) {
  let fileName = relativePath;
  if (extra.filePath.includes('platforms/')) {
    fileName = `platform/${fileName}`;
  }

  return `
System.register("tests/${fileName.substr(0, fileName.lastIndexOf('.'))  + '.lint-test.js'}", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", describeModule("core/lint", function () { return {}; }, function () {
        describe("Check eslint on ${fileName}", function () {
          it('should have no style error', function () {
            chai.expect(${errors.length}).to.equal(0);
          });
        });
      }));
      }
  };
});
  `;
}


function getLintTestsTree() {
  // Load .eslintignore
  let eslintIgnore;
  try {
    const lines = fs.readFileSync(process.cwd() + '/.eslintignore', 'utf8').split('\n');
    eslintIgnore = new Set(lines);
  } catch (e) {
    eslintIgnore = new Set();
  }

  // Checks if the given path is in .eslintignore file
  const shouldNotLint = (filePath, srcDir) => {
    const isPlatform = srcDir !== undefined;
    let fullPath;
    if (isPlatform) {
      fullPath = `platforms/${srcDir}/${filePath}`;
    } else {
      fullPath = `modules/${filePath}`;
    }

    return eslintIgnore.has(fullPath);
  };

  // Generate tree of test files for eslint
  const generateTestTree = (tree, destDir, srcDir) => {
    const treeToLint = new Funnel(tree, {
      srcDir,
      exclude: [filePath => shouldNotLint(filePath, srcDir)],
    });
    const esLinterTree = ESLint.create(treeToLint, {
      options: eslintOptions,
      testGenerator,
    });
    esLinterTree.extensions = ['es', 'jsx'];

    return new Funnel(esLinterTree, { destDir });
  };

  const platform = getPlatformFunnel();
  const sources = getSourceFunnel();

  return new MergeTrees([
    generateTestTree(platform, 'tests/platform', cliqzConfig.platform),
    generateTestTree(sources, 'tests'),
  ]);
}


function getBrowserifyTree() {
  const browserifyTrees = [];
  const basePath = path.join(__dirname, '..');

  // Browserify modules
  cliqzConfig.modules.forEach((name) => {
    const modulePath = path.join('modules', name);
    walk(modulePath, p => p.endsWith('.browserify'))
    .forEach((p) => {
      const rel = path.relative('modules', p);
      const options = {
        browserify: {
          entries: [rel],
          debug: false,
          paths: [
            path.join(basePath, 'node_modules'),
          ],
        },
        outputFile: rel.replace(/\.browserify$/, '.js'),
        cache: true,
      };
      browserifyTrees.push(new Funnel(watchify(modulesTree, options), {
        getDestinationPath(p) {
          return p.replace('/sources', '');
        },
      }));
    });
  });

  // Browserify platform
  const platformPath = path.join('platforms/', cliqzConfig.platform);
  walk(platformPath, p => p.endsWith('.browserify'))
  .forEach((p) => {
    const rel = path.relative(platformPath, p);
    const options = {
      browserify: {
        entries: [rel],
        debug: false,
        paths: [
          path.join(basePath, 'node_modules'),
        ],
      },
      outputFile: rel.replace(/\.browserify$/, '.js'),
      cache: true,
    };
    browserifyTrees.push(new Funnel(watchify(platformPath, options), {
      getDestinationPath(p) {
        return `platform/${p}`;
      },
    }));
  });

  return new MergeTrees(browserifyTrees);
}

function getSourceTree() {
  let sources = getSourceFunnel();
  const config = writeFile('core/config.es', 'export default '+JSON.stringify(cliqzConfig, null, 2));

  sources = new MergeTrees([
    sources,
    config,
    contentScriptsImport,
    contentTestsImport,
    new Funnel(modulesList, { destDir: 'core/app' }),
  ]);

  const moduleTestsTree = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name =>  `${name}/tests/**/*.es`),
    getDestinationPath(path) {
      return path.replace("/tests", "");
    }
  });

  const transpiledSources = Babel(
    sources,
    babelOptions
  );
  let transpiledModuleTestsTree = Babel(
    new Funnel(moduleTestsTree, { destDir: 'tests' }),
    babelOptions
  );

  let sourceTrees = [
    getBrowserifyTree(),
    transpiledSources,
  ];
  if ((env.TESTING) &&
      (cliqzConfig.testem_launchers || []).length) {
    sourceTrees.push(transpiledModuleTestsTree);
  }

  const exclude = ["**/*.jshint.js"];

  if (!env.TESTING) {
    exclude.push("**/content-tests.bundle*");
  }

  return new Funnel(
    new MergeTrees(sourceTrees), //, { overwrite: true }),
    {
      exclude: exclude
    }
  );
}

const sourceTree = new MergeTrees([
  getPlatformTree(),
  getSourceTree(),
  getHandlebarsTree(modulesTree),
]);

const staticTree = new MergeTrees([
  getDistTree(modulesTree),
  getSassTree(),
]);

const styleCheckTestsTree = cliqzConfig.PRODUCTION ?
  new MergeTrees([]) : getLintTestsTree();

const bundlesTree = getBundlesTree(
  new MergeTrees([
    sourceTree,
    staticTree,
  ])
);

module.exports = {
  static: staticTree,
  modules: sourceTree,
  bundles: bundlesTree,
  styleTests: styleCheckTestsTree,
};
