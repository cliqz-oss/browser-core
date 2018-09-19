'use strict';

const path = require('path');
const SystemBuilder = require('./broccoli-systemjs');
const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const SourceMaps = require('broccoli-source-map');
const deepAssign = require('deep-assign');
const env = require('../cliqz-env');
const replace = require('broccoli-replace');

const cliqzEnv = require('../cliqz-env');
const cliqzConfig = require('../config');
const helpers = require('./helpers');
const walk = helpers.walk;
const SourceMapExtractor = SourceMaps.SourceMapExtractor;

const bundlesSourceMapPaths = {};

function saveBundleSourceMapPath(bundleName, bundlePath, basePath) {
  bundlesSourceMapPaths[bundleName] = bundlePath
    .replace(/^(modules|platforms)\//, basePath)
    .replace('/firefox/', '/')
    .replace('/sources/', '/')
    .replace(/bundle\.es$/, 'bundle.js.map');
}

function replaceFileExtension(filename) {
  const filenameParts = filename.split('.');
  filenameParts.pop();
  filenameParts.push('js');
  return filenameParts.join('.');
}

function getBundlesTree(modulesTree) {
  const prefix = 'modules';
  const bundleFiles = cliqzConfig.bundles;
  const platformName = cliqzConfig.platform;
  let allBundleFiles = [].concat(
    // modules
    cliqzConfig.modules.map((moduleName) => {
      const modulePath = path.join('modules', moduleName);
      const inputFiles =  walk(modulePath, fileName => fileName.endsWith('.bundle.es'));
      return inputFiles.map((bundlePath) => {
        const bundlePathParts = bundlePath.split(path.sep)
        let bundleName = bundlePathParts[bundlePathParts.length-1];
        bundleName = replaceFileExtension(bundleName);
        saveBundleSourceMapPath(bundleName, bundlePath, 'http://localhost:4300/cliqz@cliqz.com/chrome/content/');

        return moduleName+'/'+bundleName;
      });
    }).reduce((all, curr) => all.concat(curr), []),

    // platform
    walk(path.join('platforms', platformName), fileName => fileName.endsWith('.bundle.es'))
    .map((bundlePath) => {
      const bundlePathParts = bundlePath.split(path.sep)
      let bundleName = bundlePathParts[bundlePathParts.length-1];
      bundleName = replaceFileExtension(bundleName);
      saveBundleSourceMapPath(bundleName, bundlePath, 'http://localhost:4300/cliqz@cliqz.com/chrome/content/platform/');

      return 'platform/'+bundleName;
    }),
    // other platforms
    walk(path.join('platforms'), fileName => fileName.endsWith('.bundle.es'))
    .filter(p => p.split(path.sep)[0] !== platformName)
    .map((bundlePath) => {
      const bundlePathParts = bundlePath.split(path.sep)
      let bundleName = bundlePathParts[bundlePathParts.length-1];
      const platformName = bundlePathParts[1];

      // remove "platforms"
      bundlePathParts.shift();
      // remove platform name
      bundlePathParts.shift();

      bundleName = replaceFileExtension(bundlePathParts.join('/'));
      saveBundleSourceMapPath(bundleName, bundlePath, 'http://localhost:4300/cliqz@cliqz.com/chrome/content/platform-'+platformName+'/');

      return 'platform-'+platformName+'/'+bundleName;
    })
  );

  let excludedBundleFiles;

  if (typeof bundleFiles === "undefined") {
    excludedBundleFiles = [];
  } else if (bundleFiles.length === 0) {
    excludedBundleFiles = ['**/*'];
  } else {
    excludedBundleFiles = allBundleFiles.filter(f => bundleFiles.indexOf(f) === -1);
  }

  const input = new Funnel(modulesTree, {
    destDir: prefix,
    exclude: excludedBundleFiles,
  });

  const cliqzConfigSystem = cliqzConfig.system || {};
  const cliqzConfigBundler = cliqzConfig.bundler || {};

  const systemConfig = {
    transpiler: false,
    packageConfigPaths: [
      path.join('node_modules', '*', 'package.json'),
      path.join('node_modules', '@*', '*', 'package.json'),
    ],
    map: Object.assign({
      'plugin-json': 'node_modules/systemjs-plugin-json/json.js',
    }, cliqzConfigSystem.map || {}),
    paths: {
      'specific/*': './specific/'+cliqzConfig.platform+'/*',
      'modules/*': 'modules/*',
      'modules': 'modules',
      'node_modules/*': './node_modules/*',
      '*': './node_modules/*',
    },
    meta: Object.assign({
      'specific/*': {
        format: 'global',
      },
      '*.json': {
        loader: 'plugin-json',
      },
    }, cliqzConfigSystem.meta || {}),
    packages: deepAssign({
      [prefix]: {
        defaultJSExtensions: true,
        //format: 'system',
        meta: {
          '*/templates.js': {
            format: 'system',
          },
        },
      },
    }, cliqzConfigSystem.packages || {}),
  };

  const builderConfig = {
    externals: cliqzConfigBundler.externals || [],
    globalDeps: cliqzConfigBundler.globalDeps || {},
    sourceMaps: !cliqzEnv.PRODUCTION,
    lowResSourceMaps: false,
    sourceMapContents: true,
    // required in case source module format is not esmb
    globalName: 'CliqzGlobal',
    // format: 'esm',
    // sourceMaps: cliqzConfig.PRODUCTION ? false : 'inline'
    rollup: !cliqzConfig.TESTING,
  };

  const output = new Funnel(
    new SystemBuilder(input, {
      systemConfig: cliqzConfig.systemDefault || systemConfig,
      builderConfig: cliqzConfig.builderDefault || builderConfig,
      bundleConfigs: cliqzConfig.bundleConfigs || {}
    }),
    {
      srcDir: prefix,
      allowEmpty: true,
    }
  );

  // Replace source map references with served from localhost:4300,
  // otherwise sourcemaps will not work in firefox devtools.
  return replace(output, {
    files: [
      '**/*.bundle.js'
    ],
    usePrefix: false,
    patterns: [
      {
        match: /(?:^|\n)\/\/# sourceMappingURL=([^\s]+)/,
        replacement: function(_, bundleMapName) {
          const bundleNameParts = bundleMapName.split('.');
          bundleNameParts.pop();
          const bundleName = bundleNameParts.join('.');
          return `//# sourceMappingURL=${bundlesSourceMapPaths[bundleName]}`;
        }
      }
    ]
  });
}

module.exports = getBundlesTree;
