const Plugin = require('broccoli-plugin'); // eslint-disable-line import/no-extraneous-dependencies
const Builder = require('@cliqz-oss/systemjs-builder');
const writeOutputs = require('@cliqz-oss/systemjs-builder/lib/output').writeOutputs;
const extend = require('@cliqz-oss/systemjs-builder/lib/utils').extend;
const deepFreeze = require('deep-freeze'); // eslint-disable-line import/no-extraneous-dependencies
const path = require('path');
const glob = require('glob'); // eslint-disable-line import/no-extraneous-dependencies
const fs = require('fs');
const os = require('os');

const isUnixBasedPlatform = () => os.EOL === '\n';

const slash = ((isUnixBased) => {
  const func = isUnixBased ?
    input => input :
    (input) => {
      // source: https://github.com/sindresorhus/slash/blob/master/index.js
      const isExtendedLengthPath = /^\\\\\?\\/.test(input);
      const hasNonAscii = /[^\u0000-\u0080]+/.test(input);

      if (isExtendedLengthPath || hasNonAscii) {
        return input;
      }

      return input.replace(/\\/g, '/');
    };

  return func;
})(isUnixBasedPlatform(os));

// This function is taken from '@cliqz-oss/systemjs-builder/lib/output' module;
// We need this since writing a bundle source to a file requires opts preprocessing.
// TODO: in the future we can create a PR for a systemjs-builder team to export this
// function from the module '@cliqz-oss/systemjs-builder/lib/output' so no need to hardcode else.
//
// !!! PLEASE do not review this function since its' source code was copied and pasted.
function processOutputOpts(options, defaults) {
  const opts = {
    outFile: undefined,

    minify: false,
    uglify: undefined,
    mangle: true,

    sourceMaps: false,
    sourceMapContents: undefined
  };

  extend(opts, defaults);
  extend(opts, options);

  opts.uglify = opts.uglify || {};
  opts.uglify.output = opts.uglify.output || {};
  opts.uglify.compress = opts.uglify.compress || {};
  opts.uglify.beautify = opts.uglify.beautify || opts.uglify.output;

  // NB deprecated these for uglify directly
  if (opts.globalDefs && !('global_defs' in opts.uglify.compress)) {
    opts.uglify.compress.global_defs = opts.globalDefs;
  }
  if (opts.ascii && !('ascii' in opts.uglify.beautify)) {
    opts.uglify.beautify.ascii_only = opts.ascii;
  }
  delete opts.globalDefs;
  delete opts.ascii;

  if (!('dead_code' in opts.uglify.compress)) {
    opts.uglify.compress.dead_code = true;
  }
  if (!('warnings' in opts.uglify.compress)) {
    opts.uglify.compress.warnings = false;
  }

  // source maps 'inline' handling
  if (opts.sourceMapContents === undefined) {
    opts.sourceMapContents = opts.sourceMaps === 'inline';
  }

  if (opts.sourceMapContents) {
    opts.uglify.sourceMapIncludeSources = true;
  }

  return opts;
}
// Define file extensions which we need to collect statistics about.
// These files are supposed to be stored in a Broccoli temporary directory
// after a build process is complete.
const FILE_EXTENSIONS = [
  'js', 'es', 'jsx'
];

// These RegExp pattern is used to filter out bundles' names.
// Let's assume we have a file path like `/serp/serp.bundle.js`.
// Then this RegExp is aimed to match `serp` and then let us use it further on.
const BUNDLE_NAME_REG_EXP = new RegExp('/([^/]+)\\.bundle.js');

// This function collects files statistics.
// These files are supposed to be stored in a directory (`dir`).
// Only files having ext from FILE_EXTENSIONS are kept tracking.
// This mechanism works recursively for every single directory inside of `dir` argument.
// The function returns an object (without a prototype chain!) keys of which are always
// absolute file pathes and values are last modified date in term of a timestamp.
const buildNextTree = function buildNextTree(dir) {
  const tree = Object.create(null);

  glob.sync(`**/*.{${FILE_EXTENSIONS}}`, {
    cwd: dir,
    follow: true,
  }).forEach((file) => {
    const f = path.join(dir, file);
    const stats = fs.statSync(f);

    tree[f] = stats.mtime.getTime();
  });

  return tree;
};

// This function compares two trees against similarities.
// A tree is an object which is obtained from buildNextTree function.
// It is supposed to contain key/value pair.
// key - absolute path to a file, value - timestamp when a file was modified.
// The function returns an array of differencies between provided trees.
// This array consists of objects of path - full absolute path to a file in OS.
// If lastTree is null (meaning we do not need to find differences by any reason)
// then the function returns empty array.
//
// So does it if nextTree is a falsy value or an empty object.
const findDiff = function findDiff(lastTree = null, nextTree = {}) {
  const diff = [];

  if (lastTree == null) {
    return diff;
  }

  Object.keys(nextTree).forEach((key /* absolute filePath */) => {
    if (lastTree[key] == null || lastTree[key] !== nextTree[key]) {
      diff.push({
        path: key,
      });
    }
  });

  return diff;
};

module.exports = class BroccoliSystemjs extends Plugin {
  constructor(inputNode, options = {}) {
    super([inputNode], {
      annotation: options.annotation,
    });

    this.bundleDeps = null;
    this.lastTree = null;
    this.systemConfig = deepFreeze(options.systemConfig || {});
    this.builderConfig = deepFreeze(options.builderConfig || {});
    this.bundleConfigs = deepFreeze(options.bundleConfigs || {});
    this.builders = new Map();
  }

  isFileBundleItself(filePath = '') {
    return filePath.search(BUNDLE_NAME_REG_EXP) !== -1;
  }

  getTableOfBundlesToRebuild(filesRelatedToBundles = []) {
    const bundleNames = Object.create(null); // we do not need a prototype;
    if (this.bundleDeps == null) {
      return bundleNames;
    }

    const bundleDepsKeys = Object.keys(this.bundleDeps);

    for (let i = 0, l = filesRelatedToBundles.length; i < l; i += 1) {
      const bundleFile = slash(filesRelatedToBundles[i]);

      if (this.isFileBundleItself(bundleFile) && this.bundleDeps[bundleFile]) {
        bundleNames[bundleFile] = this.bundleDeps[bundleFile].bundle;
      } else {
        bundleDepsKeys.forEach((bundleName) => {
          // {bundle: <object>, filesTable: <object>}
          const bundleDeps = this.bundleDeps[bundleName];
          if (bundleDeps.filesTable[bundleFile]) {
            bundleNames[bundleName] = bundleDeps.bundle;
          }
        });
      }
    }

    return bundleNames;
  }

  updateBundleDeps(bundle = {}) {
    const bundleFiles = Object.keys(bundle.tree || {});

    // Now we need to find a bundleName to exclude it from searching for a diff;
    const i = bundleFiles.findIndex(b => b.search(BUNDLE_NAME_REG_EXP) !== -1);
    if (i === -1) {
      return;
    }

    const bundleName = bundleFiles[i];
    bundleFiles.splice(i, 1);

    this.bundleDeps = this.bundleDeps || {};
    this.bundleDeps[bundleName] = this.bundleDeps[bundleName] || {
      bundle: {},
      filesTable: {},
    };
    this.bundleDeps[bundleName].bundle = bundle;

    bundleFiles.forEach((bundleFile) => {
      this.bundleDeps[bundleName].filesTable[bundleFile] = true;
    });
  }

  build() {
    const inputPath = this.inputPaths[0];
    const outputPath = this.outputPath;

    const nextTree = buildNextTree(inputPath);

    const diff = findDiff(this.lastTree, nextTree);
    this.lastTree = nextTree;

    // We need to define whether there are any bundles to rebuild.
    // If so then diff.length is greater than 0 and bundlesToRebuild will contain an object
    // with a following key/value pairs:
    // key @string - a bundle file path relatively inputPath
    // value @string - a bundle object itself previously stored in a bundleDeps cache.
    const bundlesToRebuild = diff.length > 0 ?
      this.getTableOfBundlesToRebuild(
        diff.map(item => item.path.slice(inputPath.length + 1))
      ) :
      {};

    // We can create only one builder instance for all.
    let builder = this.builders.get(inputPath);
    if (!builder) {
      builder = new Builder(`file:///${inputPath}`);
      this.builders.set(inputPath, builder);
    } else {
      builder.reset();
    }

    let bundleBuildCounter = 0;
    console.log('******************************************************************'); // eslint-disable-line no-console
    const bundles = glob.sync('**/*.bundle.js', {
      cwd: inputPath,
      follow: true,
    }).map((inputFile) => {
      const bundleConfig = this.bundleConfigs[inputFile] || {};
      const bundleSystemConfig = bundleConfig.systemConfig || this.systemConfig;
      const bundleBuilderConfig = bundleConfig.builderConfig || this.builderConfig;

      builder.config(bundleSystemConfig);

      // If any file was changed so far
      if (diff.length > 0) {
        // If this bundle `inputFile` should not be rebuilt then we can get its' content and
        // just write it to a proper final destination (write a bundle file to a `./build`)
        if (!bundlesToRebuild[inputFile] && this.bundleDeps[inputFile]) {
          return writeOutputs(
            [this.bundleDeps[inputFile].bundle.source],
            builder.loader.baseURL,
            processOutputOpts(bundleBuilderConfig, { outFile: path.join(outputPath, inputFile) })
          );
        }

        // A bundle named `inputFile` should be rebuilt (some files were changed affecting it).
        // Output a notification about that.
        console.dir(`Rebuilding bundle: ${inputFile}`, { colors: true }); // eslint-disable-line no-console
        bundleBuildCounter += 1;
      } else {
        // Diff does not contain anything meaning every single bundle should be built from scratch.
        console.dir(`Building bundle: ${inputFile}`, { colors: true }); // eslint-disable-line no-console
        bundleBuildCounter += 1;
      }

      return builder.buildStatic(
        inputFile,
        path.join(outputPath, inputFile),
        bundleBuilderConfig
      ).then((bundle) => {
        this.updateBundleDeps(bundle);
        return bundle;
      });
    });

    // TODO: paralelize into multiple threads
    return Promise.all(bundles).then((res) => {
      console.log(`${bundleBuildCounter} bundle(s) has(have) been created`); // eslint-disable-line no-console
      console.log('******************************************************************'); // eslint-disable-line no-console

      return res;
    });
  }
};
