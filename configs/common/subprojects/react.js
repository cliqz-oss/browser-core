const cliqzEnv = require('../../../broccoli/cliqz-env');

let env = cliqzEnv.PRODUCTION ? 'production' : 'development';

// Serve profiling build on beta so as to make profiling component work.
if (cliqzEnv.IS_BETA) {
  env = 'profiling';
}

let suffix = '';
if (env === 'production' || env === 'profiling') {
  suffix = '.min';
}

module.exports = {
  react: {
    src: 'node_modules/react/umd',
    include: [`react.${env}${suffix}.js`],
    dest: 'vendor'
  },
  reactDom: {
    src: 'node_modules/react-dom/umd',
    include: [`react-dom.${env}${suffix}.js`],
    dest: 'vendor'
  },
  reactTestUtils: {
    src: 'node_modules/react-dom/umd',
    include: ['react-dom-test-utils.development.js'],
    dest: 'vendor'
  }
};
