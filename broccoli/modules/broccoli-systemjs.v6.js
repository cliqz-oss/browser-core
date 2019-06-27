const Plugin = require('broccoli-plugin'); // eslint-disable-line import/no-extraneous-dependencies
const deepFreeze = require('deep-freeze'); // eslint-disable-line import/no-extraneous-dependencies
const path = require('path');
const glob = require('glob'); // eslint-disable-line import/no-extraneous-dependencies
const fs = require('fs');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = class BroccoliWebpack extends Plugin {
  constructor(inputNode, options = {}) {
    super([inputNode], {
      annotation: options.annotation,
    });

    this.webpack = require('webpack');
    this.builderConfig = options.builderConfig || {
      globalDeps: {}
    };
  }

  build() {
    const inputPath = this.inputPaths[0];
    const outputPath = this.outputPath;
    const webpack = this.webpack;

    console.log('*********************** Bundling Process Started *******************************'); // eslint-disable-line no-console
    const bundles = glob.sync('**/*.bundle.js', {
      cwd: inputPath,
      follow: true,
    });
    const bundleBuildCounter = bundles.length;
    const entries = {};

    bundles.forEach(function(bundle) {
      entries[bundle] = path.join(inputPath, bundle);
    });

    return new Promise((resolve, reject) => {
      let t1 = new Date().getTime();

      webpack({
        mode: process.env.CLIQZ_ENVIRONMENT,
        entry: entries,
        output: {
          filename: '[name]',
          path: outputPath
        },
        devtool: 'source-map',
        resolve: {
          symlinks: false,
          modules: [
            path.resolve(process.cwd(), 'node_modules'),
          ]
        },
        node: {
          fs: 'empty',
        },
        plugins: [
          new HardSourceWebpackPlugin()
        ],
        externals: this.builderConfig.globalDeps,
      }, function(error, stats) {
        if (error || stats.hasErrors()) {
          console.log(stats.toString({colors: true}));
          return reject();
        }

        let t2 = new Date().getTime();
        console.dir(`Built: took ${(t2 - t1) / 1000} seconds`, { colors: true }); // eslint-disable-line no-console

        console.log(Object.keys(entries).join('\n'));
        console.dir(`${bundleBuildCounter} bundle(s) has(have) been created`, { colors: true }); // eslint-disable-line no-console
        console.log('*********************** Bundling Process Finished *******************************'); // eslint-disable-line no-console
        resolve();
      });
    });
  }
};
