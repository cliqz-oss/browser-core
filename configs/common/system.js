/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const cliqzEnv = require('../../broccoli/cliqz-env');

const builderConfig = {
  externals: ['react', 'react-dom', 'jquery', 'handlebars', 'math-expression-evaluator'],
  globalDeps: {
    react: 'React',
    'react-dom': 'ReactDOM',
    jquery: '$',
    handlebars: 'Handlebars',
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

module.exports = {
  builderConfig,
};
