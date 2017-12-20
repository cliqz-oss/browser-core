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
    'handlebars': 'bower_components/handlebars/handlebars.js',
    'jquery': 'bower_components/jquery/dist/jquery.js',
    'mathjs': 'bower_components/mathjs/dist/math.min.js',
    'bigint': 'bower_components/bigint/index.js',
    'md5': 'bower_components/md5/index.js',
    'react': 'node_modules/react/cjs/react.production.min.js',
    'chai': 'node_modules/chai/chai.js',
    'chai-dom': 'node_modules/chai-dom/chai-dom.js',
    'react-dom': 'node_modules/react-dom/cjs/react-dom.production.min.js',
    'qrcode': 'node_modules/qrcodejs/qrcode.min.js',
    'plugin-json': 'node_modules/systemjs-plugin-json/json.js',
  },
  paths: {
    'specific/*': './specific/firefox/*',
    'bower_components/*': './bower_components/*',
    'modules/*': 'modules/*',
    'modules': 'modules',
    'node_modules/*': './node_modules/*',
    '*': './node_modules/*',
  },
  meta: {
    'specific/*': {
      format: 'global',
    },
    'bower_components/*': {
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
      map: {
        './platform/tldjs': 'node_modules/tldjs/index.js'
      },
      meta: {
        './platform/lib/zlib.js': {
          'format': 'system'
        },
        './platform/lib/sanitize-filename.js': {
          'format': 'system'
        },
        './core/lib/cron-parser.js': {
          'format': 'system'
        },
        './platform/video-downloader/lib/ytdl-core.js': {
          'format': 'system'
        },
        './platform/fast-url-parser.js': {
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
  'modules/hpn/worker.bundle.js': {
    builderConfig: Object.assign({}, builderConfig, {
      rollup: true,
    }),
  },
};

module.exports = {
  systemConfig,
  builderConfig,
  appBundleConfig
};
