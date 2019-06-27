/* eslint-disable */

'use strict';

const path = require('path');
const cliqzEnv = require('../../broccoli/cliqz-env');

const systemConfig = {
  transpiler: false,
  packageConfigPaths: [
    'node_modules/*/package.json',
    'node_modules/@*/*/package.json',
  ],
  map: {
    'handlebars': 'node_modules/handlebars/dist/handlebars.min.js',
    'jquery': 'node_modules/jquery/dist/jquery.min.js',
    'math-expression-evaluator': 'node_modules/math-expression-evaluator/dist/browser/math-expression-evaluator.min.js',
    'react': 'node_modules/react/cjs/react.production.min.js',
    'prop-types': 'node_modules/prop-types/prop-types.js',
    'chai': 'node_modules/chai/chai.js',
    'chai-dom': 'node_modules/chai-dom/chai-dom.js',
    'react-dom': 'node_modules/react-dom/cjs/react-dom.production.min.js',
    'qrcodejs': 'node_modules/qrcodejs/qrcode.min.js',
    'plugin-json': 'node_modules/systemjs-plugin-json/json.js',
    'pako': 'node_modules/pako/dist/pako.js',
    'react-tooltip': 'react-tooltip/standalone/react-tooltip.js',
    'rxjs/operators': 'rxjs/operators/index',
    'deep-equal': 'modules/platform/lib/deep-equal',
    'tldts': `node_modules/tldts/dist/tldts-experimental.${cliqzEnv.DEVELOPMENT ? 'umd.min' : 'esm'}.js`,
  },
  paths: {
    'specific/*': './specific/firefox/*',
    'modules/*': 'modules/*',
    'modules': 'modules',
    'node_modules/*': './node_modules/*',
    '*': './node_modules/*',
  },
  meta: {
    'specific/*': {
      format: 'global',
    },
    '*.json': {
      loader: 'plugin-json',
    },
  },
  packages: {
    'object-assign': {
      'main': './index.js'
    },
    modules: {
      defaultJSExtensions: true,
      //format: 'system',
      meta: {
        './platform*/lib/zlib.lib.js': {
          'format': 'cjs'
        },
        './platform*/lib/sanitize-filename.js': {
          'format': 'system'
        },
        './platform*/video-downloader/lib/ytdl-core.js': {
          'format': 'system'
        },
        './platform*/lib/deep-equal.js': {
          'format': 'system'
        },
        '*/templates.js': {
          format: 'system',
        },
      }
    },
  },
};

const builderConfig = {
  externals: ['react', 'react-dom', 'jquery', 'handlebars', 'math-expression-evaluator'],
  globalDeps: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'jquery': '$',
    'handlebars': 'Handlebars',
    'math-expression-evaluator': 'mexp',
  },
  sourceMaps: !cliqzEnv.PRODUCTION,
  lowResSourceMaps: true,
  sourceMapContents: true,
  // required in case source module format is not esmb
  globalName: 'CliqzGlobal',
  // format: 'esm',
  // sourceMaps: cliqzConfig.PRODUCTION ? false : 'inline'
  rollup: !cliqzEnv.DEVELOPMENT,
};

const appBundleConfig = {
  'modules/core/app.bundle.js': {
    systemConfig: Object.assign({}, systemConfig, {
      packages: Object.assign({}, systemConfig.packages, {
        'modules/dropdown': {
          handlebars: '../platform/lib/handlebars'
        }
      })
    }),
    builderConfig: Object.assign({}, builderConfig, {
      externals: ['math-expression-evaluator'],
      globalDeps: {
        'math-expression-evaluator': 'mexp'
      },
    }),
  },
};

module.exports = {
  systemConfig,
  builderConfig,
  appBundleConfig
};
