/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AsyncStorage } from 'react-native';

import KVStorage from './factory';

export default class Storage extends KVStorage {
  constructor(asyncStorage: AsyncStorage) {
    super({
      del: (key: string) => asyncStorage.removeItem(key),
      get: (key: string) => asyncStorage.getItem(key),
      set: (key: string, value: string) => asyncStorage.setItem(key, value),

      multiDel: (keys: string[]) => asyncStorage.multiRemove(keys),
      multiGet: (keys: string[]) => asyncStorage.multiGet(keys),
      multiSet: (items) => asyncStorage.multiSet(items),

      getAllKeys: () => asyncStorage.getAllKeys(),
    });
  }
}
