/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Plugin = require('broccoli-plugin');
const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const cliqzEnv = require('../cliqz-env');

module.exports = class BroccoliWebpack extends Plugin {
  constructor(inputNode, options = {}) {
    super([inputNode], {
      annotation: options.annotation,
    });

    this.builderConfig = options.builderConfig || {
      globalDeps: {}
    };
  }

  build() {
    const inputPath = this.inputPaths[0];
    const outputPath = this.outputPath;

    console.log('*********************** Bundling Process Started *******************************');
    const bundles = glob.sync('**/*.bundle.js', {
      cwd: inputPath,
      follow: true,
    });
    const bundleBuildCounter = bundles.length;
    const entries = {};

    if (bundleBuildCounter === 0) {
      return Promise.resolve();
    }

    bundles.forEach((bundle) => {
      entries[bundle] = path.join(inputPath, bundle);
    });

    return new Promise((resolve, reject) => {
      const t1 = new Date().getTime();

      webpack({
        mode: cliqzEnv.DEVELOPMENT ? 'development' : 'production',
        entry: entries,
        output: {
          filename: '[name]',
          path: outputPath
        },
        devtool: cliqzEnv.SOURCE_MAPS ? 'source-map' : '',
        resolve: {
          symlinks: false,
          modules: [
            path.resolve(process.cwd(), 'node_modules'),
          ],
          alias: {
            '@cliqz-oss/dexie': '@cliqz-oss/dexie/dist/dexie.min.js',
            '@cliqz/url-parser': '@cliqz/url-parser/dist/url-parser.esm.min.js',
            ajv: 'ajv/dist/ajv.min.js',
            chai: 'chai/chai.js',
            'chai-dom': 'chai-dom/chai-dom.js',
            handlebars: 'handlebars/dist/handlebars.min.js',
            jquery: 'jquery/dist/jquery.min.js',
            'math-expression-evaluator': 'math-expression-evaluator/dist/browser/math-expression-evaluator.min.js',
            react: 'react/cjs/react.production.min.js',
            pako: 'pako/dist/pako.js',
            'plugin-json': 'systemjs-plugin-json/json.js',
            'prop-types': 'prop-types/prop-types.js',
            qrcodejs: 'qrcodejs/qrcode.min.js',
            'react-dom$': 'react-dom/cjs/react-dom.production.min.js',
            'react-dom/unstable-native-dependencies': 'react-dom/unstable-native-dependencies.js',
            'react-tooltip': 'react-tooltip/standalone/react-tooltip.js',
            'rxjs/operators': 'rxjs/operators/index',
          }
        },
        node: {
          fs: 'empty',
        },
        // In development mode we would like to speed up any subsequential build process.
        // Thus using this HardSourceWebpackPlugin might be useful.
        // Since it gets cached previous build results.
        // Unlike a production build where it gets compiled only once and we do need to cache it.
        plugins: cliqzEnv.DEVELOPMENT ? [
          new HardSourceWebpackPlugin({
            // Clean up large, old caches automatically.
            cachePrune: {
              // Caches younger than `maxAge` are not considered for deletion. They must
              // be at least this (default: 2 hours) old in milliseconds.
              maxAge: 2 * 60 * 60 * 1000,
              // All caches together must be larger than `sizeThreshold` before any
              // caches will be deleted. Together they must be at least this
              // (default: 500 MB) big in bytes.
              sizeThreshold: 500 * 1024 * 1024
            },
          }),
        ] : [],
        externals: this.builderConfig.globalDeps,
        optimization: {
          minimizer: [
            new TerserPlugin({
              sourceMap: cliqzEnv.SOURCE_MAPS,
            }),
          ],
          // For production build webpack normally combines all dependencies
          // within a single function.
          // Also it tries to optimize the code in a way of the less variables the better.
          // In our case with RxJs that has resulted into a runtime error which was also impossible
          // to catch while running tests (since history search is covered with mocked data).
          // Disabling module concatenation is telling webpack to put every module dependency in a
          // separate function which in turn is called whenever it needs.
          // This results almost the same size of a final bundle but without fancy combined sources.
          concatenateModules: false,
          // Some npm packages might be marked as having sideEffects (in a package.json).
          // This is telling webpack that some unpredictable (come'n, npm is open source!) behaviour
          // could happen so that webpack could avoid including that module in its' bundle.
          sideEffects: false,
        }
      }, (error, stats) => {
        if (error || stats.hasErrors()) {
          console.log(stats.toString({ colors: true }));
          return reject();
        }

        const t2 = new Date().getTime();
        console.dir(`Built: took ${(t2 - t1) / 1000} seconds`, { colors: true });

        console.log(Object.keys(entries).join('\n'));
        console.dir(`${bundleBuildCounter} bundle(s) has(have) been created`, { colors: true });
        console.log('*********************** Bundling Process Finished *******************************');
        return resolve();
      });
    });
  }
};
