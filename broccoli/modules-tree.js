/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const Babel = require('broccoli-babel-transpiler');
const ESLint = require('broccoli-lint-eslint');
const broccoliSource = require('broccoli-source');

const WatchedDir = broccoliSource.WatchedDir;
const writeFile = require('broccoli-file-creator');
const env = require('./cliqz-env');

const cliqzConfig = require('./config');
const modulesList = require('./modules/modules-list');
const contentScriptsImport = require('./modules/content-script-imports');
const contentTestsImport = require('./modules/content-tests-imports');
const integrationTestsImport = require('./modules/integration-tests-imports');
const localesTree = require('./modules/locale-tree');

const getBundlesTree = require('./modules/bundles-tree');
const getHandlebarsTree = require('./modules/handlebars-tree');
const getSassTree = require('./modules/sass-tree');
const getDistTree = require('./modules/dist-tree');

const modulesTree = new WatchedDir('modules');

const targets = cliqzConfig.buildTargets || {
  firefox: 57,
};

const babelOptions = {
  babelrc: false,
  presets: [
    ['@babel/env', {
      targets,
      modules: false,
      exclude: [
        '@babel/plugin-transform-template-literals',
        '@babel/plugin-transform-regenerator'
      ]
    }],
    ['@babel/typescript'],
    ['@babel/react'],
  ],
  compact: false,
  sourceMaps: false,
  filterExtensions: ['es', 'jsx', 'ts', 'tsx'],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-exponentiation-operator',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-react-jsx',
    '@babel/plugin-proposal-async-generator-functions',
    '@babel/plugin-transform-async-to-generator',
    ...(cliqzConfig.babelPlugins || []),
    ...(cliqzConfig.format === 'common' ? ['@babel/plugin-transform-modules-commonjs'] : []),
    ...(cliqzConfig.format === 'system' ? ['@babel/plugin-transform-modules-systemjs'] : []),
  ],
  throwUnlessParallelizable: true,
};

const eslintOptions = {
  configFile: `${process.cwd()}/.eslintrc`,
  persist: true,
};


function getPlatformFunnel() {
  return new Funnel(new WatchedDir('platforms/'), {
    exclude: ['**/tests/**/*'],
  });
}

function getTestsFunnel() {
  const inc1 = cliqzConfig.modules.map(name => `${name}/**/tests/**/*.es`);
  const inc2 = cliqzConfig.modules.map(name => `${name}/**/tests/unit/dist/**/*`);
  return new Funnel(modulesTree, {
    include: [...inc1, ...inc2],
    exclude: cliqzConfig.modules.map(name => `${name}/**/tests/**/*lint-test.js`),
  });
}

const dirs = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory());

function getPlatformTree() {
  const platformName = cliqzConfig.platform;
  let platform = getPlatformFunnel();

  platform = Babel(platform, { ...babelOptions });
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
      })),
  ]);
}

function getSourceFunnel() {
  return new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/sources/**/*.{es,ts,tsx,jsx}`),
    getDestinationPath(_path) {
      return _path.replace('/sources', '');
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


function getSourceTree() {
  let sources = getSourceFunnel();
  const config = writeFile('core/config.es', `export default ${JSON.stringify(cliqzConfig, null, 2)}`);

  const includeTests = env.INCLUDE_TESTS;

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
    getDestinationPath(_path) {
      return _path.replace('/tests', '');
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
const sourceTree = new MergeTrees([
  getPlatformTree(),
  getSourceTree(),
  getHandlebarsTree(modulesTree),
], sourceTreeOptions);

const staticTree = new MergeTrees([
  getDistTree(modulesTree),
  getSassTree(),
]);

const styleCheckTestsTree = env.PRODUCTION
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
