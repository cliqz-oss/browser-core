/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const cliqzEnv = require('../../../broccoli/cliqz-env');

const env = cliqzEnv.PRODUCTION ? 'production' : 'development';

let suffix = '';
if (env === 'production') {
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
