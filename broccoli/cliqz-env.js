/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const env = (process.env.CLIQZ_ENVIRONMENT || 'development').toUpperCase();
const IS_BETA = process.env.CLIQZ_BETA === 'True';

module.exports = {
  [env]: true,
  IS_BETA,
  INCLUDE_TESTS: process.env.CLIQZ_INCLUDE_TESTS,
  SOURCE_MAPS: !(process.env.CLIQZ_SOURCE_MAPS === 'false'),
  DEBUG_PAGES: !(process.env.CLIQZ_SOURCE_DEBUG === 'false'),
};
