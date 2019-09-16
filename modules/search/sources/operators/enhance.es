/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import addLogos from './results/add-logos';
import addDistance from './results/add-distance';

const compose = fns => target => fns.reduce((ret, fn) => fn(ret), target);

export default ({ results, ...response }) => ({
  ...response,
  results: compose([
    addLogos,
    addDistance,
  ])(results),
});
