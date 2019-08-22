/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import console from '../console';
import store, { unload as unloadStore } from '../../platform/store';
import { nextTick } from '../decorators';

const listeners = new Set();

export default {
  update({ module, data }) {
    store[module] = Object.assign(store[module] || data, data);

    nextTick(() => {
      listeners.forEach((l) => {
        try {
          l(module);
        } catch (e) {
          console.error('Content Store error', e);
        }
      });
    });
  },

  get(path) {
    return store[path];
  },

  addListener(listener) {
    listeners.add(listener);
  },

  removeListener(listener) {
    listeners.delete(listener);
  },

  unload() {
    if (unloadStore) {
      unloadStore();
    }
  },
};
