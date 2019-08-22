/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PersistentMap from '../../platform/persistent-map';
import MemoryPersistentMap from '../helpers/memory-map';
import console from '../console';

/**
 * Check once globally if storage is available, then all calls to `factory`
 * will resolve to the same promise. This avoids calling multiple concurrent
 * checks + remove redundant ones.
 */
const STORAGE_FACTORY_PROMISE = (
  async function isStorageAvailable() {
    // Check if basic operations can be performed on persistent map, in which
    // case it is considered healthy. Otherwise, we might want to fallback to an
    // in-memory storage instead, which exposes the same API but does not
    // persist anything.
    try {
      const map = new PersistentMap('test_db');
      await map.init();
      await map.set('foo', 'bar');
      await map.get('foo');
      await map.destroy();
    } catch (ex) {
      console.warn('Storage not available, fallback to in-memory', ex);
      return MemoryPersistentMap;
    }

    return PersistentMap;
  }());

/**
 * Factory used to create a persistent map and fallback to in-memory storage if
 * persistence is not available (e.g.: private mode).
 */
export default function factory() {
  return STORAGE_FACTORY_PROMISE;
}
