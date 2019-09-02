/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  json(context) {
    return JSON.stringify(context);
  },

  local(key) {
    return chrome.i18n.getMessage(key);
  },

  if_eq(a, b, opts) {
    if (a === b) {
      return opts.fn(this);
    }
    return opts.inverse(this);
  }
};
