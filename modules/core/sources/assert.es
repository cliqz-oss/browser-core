/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from './prefs';

// Get 'developer' pref as soon as possible and initially assume it's not set.
let developer = false;
prefs.init().then(() => {
  developer = prefs.get('developer', false);
});

const assert = (bool, msg) => {
  if (developer === true && !bool) {
    throw new Error(`ASSERT ${msg}`);
  }
};

export default assert;
