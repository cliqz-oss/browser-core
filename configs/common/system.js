/* eslint-disable */

'use strict';

const path = require('path');
const cliqzEnv = require('../../broccoli/cliqz-env');

const systemConfig = {
  transpiler: false,
  packageConfigPaths: [
    path.join('node_modules', '*', 'package.json'),
  ],
  map: {
    'handlebars': 'node_modules/handlebars/dist/handlebars.min.js',
    'jquery': 'node_modules/jquery/dist/jquery.min.js',
    'mathjs': 'node_modules/mathjs/dist/math.min.js',
    'BigInt': 'node_modules/BigInt/src/BigInt.js',
    'react': 'node_modules/react/cjs/react.production.min.js',
    'chai': 'node_modules/chai/chai.js',
    'chai-dom': 'node_modules/chai-dom/chai-dom.js',
    'react-dom': 'node_modules/react-dom/cjs/react-dom.production.min.js',
    'qrcodejs': 'node_modules/qrcodejs/qrcode.min.js',
    'plugin-json': 'node_modules/systemjs-plugin-json/json.js',
    'pako': 'node_modules/pako/dist/pako.js',
    'fast-url-parser': 'modules/platform/lib/fast-url-parser',
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
    'BigInt': { format: 'cjs' },
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
      map: {
        './platform/tldjs': 'node_modules/tldjs/index.js'
      },
      meta: {
        './platform/lib/zlib.lib.js': {
          'format': 'cjs'
        },
        './platform/lib/sanitize-filename.js': {
          'format': 'system'
        },
        './platform/lib/cron-parser.js': {
          'format': 'system'
        },
        './platform/video-downloader/lib/ytdl-core.js': {
          'format': 'system'
        },
        './platform/lib/fast-url-parser.js': {
          'format': 'system'
        },
        './platform/lib/deep-equal.js': {
          'format': 'system'
        },
        './platform/lib/jsep.js': {
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
  externals: ['react', 'react-dom', 'jquery', 'handlebars', 'mathjs'],
  globalDeps: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'jquery': '$',
    'handlebars': 'Handlebars',
    'mathjs': 'mathLib'
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
      externals: ['mathjs'],
      globalDeps: {
        'mathjs': 'mathLib'
      },
    }),
  },
};

module.exports = {
  systemConfig,
  builderConfig,
  appBundleConfig
};
