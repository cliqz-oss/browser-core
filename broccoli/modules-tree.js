const fs = require('fs');
const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const Babel = require('broccoli-babel-transpiler');
const ESLint = require('broccoli-lint-eslint');
const broccoliSource = require('broccoli-source');
const watchify = require('broccoli-watchify');

const WatchedDir = broccoliSource.WatchedDir;
const writeFile = require('broccoli-file-creator');
const env = require('./cliqz-env');

const cliqzConfig = require('./config');
const useV6Build = cliqzConfig.use_v6_build;
const modulesList = require('./modules/modules-list');
const contentScriptsImport = require('./modules/content-script-imports');
const contentTestsImport = require('./modules/content-tests-imports');
const integrationTestsImport = require('./modules/integration-tests-imports');
const localesTree = require('./modules/locale-tree');

const helpers = require('./modules/helpers');
const getBundlesTree = require('./modules/bundles-tree');
const getHandlebarsTree = require('./modules/handlebars-tree');
const getSassTree = require('./modules/sass-tree');
const getDistTree = require('./modules/dist-tree');

const walk = helpers.walk;

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
    'transform-async-to-generator',
    'transform-async-generator-functions',
  ].concat(cliqzConfig.babelPlugins || []).concat(babelModulePlugin || []),
};

const eslintOptions = {
  configFile: `${process.cwd()}/.eslintrc`,
  persist: true,
};


function getPlatformFunnel() {
  return new Funnel(new WatchedDir('platforms/'), {
    exclude: ['**/tests/**/*', '**/*.browserify'],
  });
}

function getTestsFunnel() {
  return new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/**/tests/**/*.es`),
    exclude: cliqzConfig.modules.map(name => `${name}/**/tests/**/*lint-test.js`),
  });
}

const dirs = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory());

function getPlatformTree() {
  const platformName = cliqzConfig.platform;
  let platform = getPlatformFunnel();

  platform = Babel(platform, Object.assign({}, babelOptions));
  const platforms = dirs('./platforms');

  return new MergeTrees([
    new Funnel(platform, {
      srcDir: platformName,
      destDir: 'platform',
    }),
    ...platforms.map(p =>
      new Funnel(platform, {
        srcDir: p,
        destDir: `platform-${p}`,
      }), ),
  ]);
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
System.register("tests/${`${fileName.substr(0, fileName.lastIndexOf('.'))}.lint-test.js`}", [], function (_export) {
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
  if (process.env.CLIQZ_ESLINT !== 'true') {
    return new MergeTrees([]);
  }

  // Load .eslintignore
  let eslintIgnore;
  try {
    const lines = fs.readFileSync(`${process.cwd()}/.eslintignore`, 'utf8').split('\n');
    eslintIgnore = new Set(lines.map(l => l.replace('sources/', '')));
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
  const tests = getTestsFunnel();

  return new MergeTrees([
    generateTestTree(platform, 'tests/platform'),
    generateTestTree(sources, 'tests'),
    generateTestTree(tests, 'tests/tests'),
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
  const basePlatformPath = path.join('platforms/', cliqzConfig.platform);
  walk(basePlatformPath, p => p.endsWith('.browserify'))
    .forEach((p) => {
      const rel = path.relative(basePlatformPath, p);
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
      browserifyTrees.push(new Funnel(watchify(basePlatformPath, options), {
        getDestinationPath(p) {
          return `platform/${p}`;
        },
      }));
    });

  // Browserify platform
  const platformPath = path.join('platforms/');

  walk('platforms', p => p.endsWith('.browserify'))
    .forEach((p) => {
      const pathParts = p.split(path.sep);
      if (pathParts[1] === cliqzConfig.platform) {
        return;
      }

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

      browserifyTrees.push(
        new Funnel(
          watchify(platformPath, options),
          {
            getDestinationPath(p) {
              return `platform-${p}`;
            },
          }
        )
      );
    });

  return new MergeTrees(browserifyTrees);
}

function getSourceTree() {
  let sources = getSourceFunnel();
  const config = writeFile('core/config.es', `export default ${JSON.stringify(cliqzConfig, null, 2)}`);

  const includeTests = process.env.CLIQZ_INCLUDE_TESTS || env.TESTING;

  sources = new MergeTrees([
    sources,
    config,
    contentScriptsImport,
    includeTests ? contentTestsImport : new MergeTrees([]),
    includeTests ? integrationTestsImport : new MergeTrees([]),
    new Funnel(modulesList, { destDir: 'core/app' }),
  ]);

  const moduleTestsTree = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/tests/**/*.es`),
    getDestinationPath(path) {
      return path.replace('/tests', '');
    }
  });

  const transpiledSources = Babel(
    sources,
    babelOptions
  );
  const transpiledModuleTestsTree = Babel(
    new Funnel(moduleTestsTree, { destDir: 'tests' }),
    babelOptions
  );

  const sourceTrees = [
    transpiledSources,
  ];

  if (!useV6Build) {
    sourceTrees.unshift(getBrowserifyTree());
  }

  const exclude = ['**/*.jshint.js'];

  if (includeTests) {
    sourceTrees.push(transpiledModuleTestsTree);
  } else {
    exclude.push('**/content-tests.bundle*');
    exclude.push('**/integration-tests.bundle*');
  }

  return new Funnel(
    new MergeTrees(sourceTrees), // , { overwrite: true }),
    {
      exclude
    }
  );
}

const sourceTreeOptions = {};
if (!useV6Build) {
  sourceTreeOptions.overwrite = true;
}
const sourceTree = new MergeTrees([
  getPlatformTree(),
  getSourceTree(),
  getHandlebarsTree(modulesTree),
], sourceTreeOptions);

const staticTree = new MergeTrees([
  getDistTree(modulesTree),
  getSassTree(),
]);

const styleCheckTestsTree = process.env.CLIQZ_ENVIRONMENT === 'production'
  ? new MergeTrees([]) : getLintTestsTree();

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
  locales: localesTree,
};
