/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from '../../platform/content/globals';

export default {
  getMessage(key, ...subs) {
    let substitutions = [];
    // Firefox accepts number as substitutions but chrome does not
    if (Array.isArray(subs[0])) {
      substitutions = subs[0].map(String);
    } else {
      substitutions = subs.map(String);
    }
    return chrome.i18n.getMessage(key, substitutions) || key;
  },
};
