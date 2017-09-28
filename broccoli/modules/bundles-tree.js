'use strict';

const path = require('path');
const SystemBuilder = require('broccoli-systemjs');
const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const SourceMaps = require('broccoli-source-map');
const deepAssign = require('deep-assign');

const cliqzConfig = require('../config');
const helpers = require('./helpers');
const walk = helpers.walk;
const SourceMapExtractor = SourceMaps.SourceMapExtractor;

function replaceFileExtension(filename) {
  const filenameParts = filename.split('.');
  filenameParts.pop();
  filenameParts.push('js');
  return filenameParts.join('.');
}

function getBundlesTree(modulesTree) {
  const prefix = 'modules';
  const bundleFiles = cliqzConfig.bundles || [];

  let allBundleFiles = [].concat(
    // modules
    cliqzConfig.modules.map((moduleName) => {
      const modulePath = path.join('modules', moduleName);
      const inputFiles =  walk(modulePath, fileName => fileName.endsWith('.bundle.es'));
      return inputFiles.map((bundlePath) => {
        const bundlePathParts = bundlePath.split(path.sep)
        let bundleName = bundlePathParts[bundlePathParts.length-1];
        bundleName = replaceFileExtension(bundleName);

        return moduleName+'/'+bundleName;
      });
    }).reduce((all, curr) => all.concat(curr), []),

    // platform
    walk(path.join('platforms', cliqzConfig.platform), fileName => fileName.endsWith('.bundle.es')).map((bundlePath) => {
      const bundlePathParts = bundlePath.split(path.sep)
      let bundleName = bundlePathParts[bundlePathParts.length-1];
      bundleName = replaceFileExtension(bundleName);

      return 'platform/'+bundleName;
    })
  );

  const exludedBundleFiles = bundleFiles.length === 0 ? [] : allBundleFiles.filter(f => bundleFiles.indexOf(f) === -1);

  const input = new Funnel(modulesTree, {
    destDir: prefix,
    exclude: exludedBundleFiles,
  });

  const cliqzConfigSystem = cliqzConfig.system || {};

  const systemConfig = {
    transpiler: false,
    packageConfigPaths: [
      path.join('node_modules', '*', 'package.json'),
    ],
    map: Object.assign({
      'plugin-json': 'node_modules/systemjs-plugin-json/json.js',
    }, cliqzConfigSystem.map || {}),
    paths: {
      'specific/*': './specific/'+cliqzConfig.platform+'/*',
      'bower_components/*': './bower_components/*',
      'modules/*': 'modules/*',
      'modules': 'modules',
      'node_modules/*': './node_modules/*',
      '*': './node_modules/*',
    },
    meta: Object.assign({
      'specific/*': {
        format: 'global',
      },
      'bower_components/*': {
        format: 'global',
      },
      '*.json': {
        loader: 'plugin-json',
      },
    }, cliqzConfigSystem.meta || {}),
    packages: deepAssign({
      [prefix]: {
        defaultJSExtensions: true,
      },
    }, cliqzConfigSystem.packages || {}),
  };

  const output = new Funnel(
    new SystemBuilder(input, {
      systemConfig,
      builderConfig: {
        sourceMaps: 'inline',
      }
    }),
    {
      srcDir: prefix,
    }
  );

  return new SourceMapExtractor(output);
}

module.exports = getBundlesTree;
