/* eslint-disable */

'use strict';

const cliqzEnv = require('../../../broccoli/cliqz-env');
const env = cliqzEnv.PRODUCTION ? 'production' : 'development';

let suffix = '';
if (env === 'production') {
  suffix = '.min';
}

module.exports = {
  react: {
    "src": "node_modules/react/umd",
    "include": ["react."+ env + suffix + ".js"],
    "dest": "vendor"
  },
  reactDom: {
    "src": "node_modules/react-dom/umd",
    "include": ["react-dom."+ env + suffix + ".js"],
    "dest": "vendor"
  },
  reactTestUtils: {
    "src": "node_modules/react-dom/umd",
    "include": ["react-dom-test-utils.development.js"],
    "dest": "vendor"
  }
};
