const path = require('path');
const Funnel = require('broccoli-funnel');
const deepAssign = require('deep-assign');
const replace = require('broccoli-string-replace');

const cliqzEnv = require('../cliqz-env');
const cliqzConfig = require('../config');
const helpers = require('./helpers');
const systemBuilderPath = cliqzConfig.use_v6_build ?
  './broccoli-systemjs.v6' :
  './broccoli-systemjs';
const SystemBuilder = require(systemBuilderPath);

const walk = helpers.walk;

const bundleFiles = cliqzConfig.bundles;
const includeAllBundles = typeof bundleFiles === 'undefined';
const includedBundles = bundleFiles || [];
const prefix = 'modules';

function extractBundleProps(bundlePath) {
  // Firefox can't normally use source maps in WebExtensions
  // (see https://bugzilla.mozilla.org/show_bug.cgi?id=1437937 for details)
  // The possible solutions are either to inline them (very slow) or serve them from http server.

  // We'll use this address later in order to construct `sourceMapPath`
  const basePath = cliqzConfig.testsBasePath
    ? `http://localhost:4300/${cliqzConfig.testsBasePath.slice(8)}`
    : `http://localhost:4300/${prefix}`;

  // Remove `sources` part of the path
  const bundlePathParts = bundlePath.split(path.sep).filter(p => p !== 'sources');

  // Extract bundle name from the path
  const bundleName = bundlePathParts.pop();

  // Create new bundle name by changing file extension from `.es` to `.js`
  const bundleNameParts = bundleName.split('.');
  bundleNameParts.pop();
  bundleNameParts.push('js');
  const newBundleName = bundleNameParts.join('.');

  // Depending on the target build platform, bundles from `platforms/${PLATFORM_NAME}/..`
  // should be placed either to `platform/..` or to `platform-${PLATFORM_NAME}/..`
  let pathPrefix = bundlePathParts.shift();
  const currentPlatformName = cliqzConfig.platform;
  if (pathPrefix === 'platforms') {
    const platformName = bundlePathParts.shift();
    pathPrefix = currentPlatformName === platformName ? 'platform' : `platform-${platformName}`;
    // remove /platforms/{platformName}/ part of the original path
    bundlePathParts.shift();
    bundlePathParts.unshift(pathPrefix);
  }

  // Finally construct full output bundle path
  bundlePathParts.push(newBundleName);
  const outputPath = bundlePathParts.join(path.sep);

  // And path to source map
  const sourceMapPath = `${[basePath].concat(bundlePathParts).join(path.sep)}.map`;

  // Check if bundle should not be built
  const exclude = !includeAllBundles && !includedBundles.find(b => outputPath.endsWith(b));

  return {
    exclude,
    bundleName: newBundleName,
    outputPath,
    sourceMapPath,
  };
}

function getBundlesTree(modulesTree) {
  const bundleSourceMapPaths = [];
  const excludeBundles = new Set();

  // Take the bundle path and either add it to the set of bundles we should not build
  // or store its source maps path (we gonna need it later).
  function processBundle(bundlePath) {
    const { exclude, outputPath, bundleName, sourceMapPath } = extractBundleProps(bundlePath);
    if (exclude) {
      // Add the bundle to the set of excluded bundles.
      excludeBundles.add(outputPath);
    } else {
      // For bundles we are going to build, save the mapping [bundleName -> sourceMapPath]
      // We use Array instead of Map, because there can be different bundles with the same name,
      // and we need to have them all.
      bundleSourceMapPaths.push([bundleName, sourceMapPath]);
    }
  }

  // modules
  cliqzConfig.modules.forEach((moduleName) => {
    const modulePath = path.join('modules', moduleName);
    const inputFiles = walk(modulePath, fileName => fileName.endsWith('.bundle.es'));
    inputFiles.forEach(processBundle);
  });

  // platforms
  walk(path.join('platforms'), fileName => fileName.endsWith('.bundle.es'))
    .forEach(processBundle);

  let excludedBundleFiles;
  if (typeof bundleFiles === 'undefined') {
    excludedBundleFiles = [];
  } else if (bundleFiles.length === 0) {
    excludedBundleFiles = ['**/*'];
  } else {
    excludedBundleFiles = Array.from(excludeBundles);
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
      'node_modules/*/package.json',
      'node_modules/@*/*/package.json',
    ],
    map: Object.assign({
      'plugin-json': 'node_modules/systemjs-plugin-json/json.js',
    }, cliqzConfigSystem.map || {}),
    paths: {
      'specific/*': `./specific/${cliqzConfig.platform}/*`,
      'modules/*': 'modules/*',
      modules: 'modules',
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
        // format: 'system',
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

  let bundleSourceMapPathsCopy = bundleSourceMapPaths.concat();

  // Replace source map references with served from localhost:4300,
  // using the `bundleSourceMapPaths` we have contructed above
  return replace(output, {
    files: [
      '**/*.bundle.js'
    ],
    usePrefix: false,
    pattern: {
      match: /(?:^|\n)\/\/# sourceMappingURL=([^\s]+)/,
      replacement(_, bundleMapName) {
        const bundleNameParts = bundleMapName.split('.');
        bundleNameParts.pop();
        const bundleName = bundleNameParts.join('.');

        let sourceMapPath = bundleMapName;
        const index = bundleSourceMapPathsCopy.findIndex(([b]) => b === bundleName);
        if (index !== -1) {
          [[, sourceMapPath]] = bundleSourceMapPathsCopy.splice(index, 1);
          if (bundleSourceMapPathsCopy.length === 0) {
            bundleSourceMapPathsCopy = bundleSourceMapPaths.concat();
          }
        }
        return `//# sourceMappingURL=${sourceMapPath}`;
      }
    },
  });
}

module.exports = getBundlesTree;
