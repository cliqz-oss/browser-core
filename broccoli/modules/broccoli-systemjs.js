'use strict';

const Plugin = require('broccoli-plugin');
const Builder = require('@cliqz-oss/systemjs-builder');
const deepFreeze = require('deep-freeze');
const path = require('path');
const glob = require('glob');


module.exports = class BroccoliSystemjs extends Plugin {
  constructor(inputNode, options) {
    if (!options) {
      options = {};
    }

    super([inputNode], {
      annotation: options.annotation,
    });

    this.systemConfig = deepFreeze(options.systemConfig || {});
    this.builderConfig = deepFreeze(options.builderConfig || {});
    this.bundleConfigs = deepFreeze(options.bundleConfigs || {});
    this.builders = new Map();
  }

  build() {
    const inputPath = this.inputPaths[0];
    const outputPath = this.outputPath;

    const bundles = glob.sync('**/*.bundle.js', {
      cwd: inputPath,
      follow: true,
    }).map((inputFile) => {
      const bundleConfig = this.bundleConfigs[inputFile] || {};
      const bundleSystemConfig = bundleConfig.systemConfig || this.systemConfig;
      const bundleBuilderConfig = bundleConfig.builderConfig || this.builderConfig;
      let builder = this.builders.get(inputFile);

      if (!builder) {
        builder = new Builder(inputPath);
        this.builders.set(inputFile, builder);
      } else {
        builder.reset();
      }

      builder.config(bundleSystemConfig);

      return builder.buildStatic(
        inputFile,
        path.join(outputPath, inputFile),
        bundleBuilderConfig
      );
    });

    // TODO: paralelize into multiple threads
    return Promise.all(bundles);
  }
};
