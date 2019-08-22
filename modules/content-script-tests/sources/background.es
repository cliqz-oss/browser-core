/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';

export default background({
  init() {
    this.listener = null;
  },

  unload() {
  },

  getState() {
    return {
      a: 42,
      test: true,
    };
  },

  actions: {
    getSomeValue(...args) {
      args.pop(); // ignore `sender`
      return args;
    },

    contentScriptRan(state) {
      if (this.listener) {
        this.listener(state);
      }
      return true;
    }
  },
});
