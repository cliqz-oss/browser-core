/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import KeyValueStore from './kv-store';


export default class Storage {
  constructor(filePath) {
    this.key = [
      'resource-loader',
      ...filePath,
    ].join(':');
  }

  load() {
    return KeyValueStore.get(this.key);
  }

  save(data) {
    return KeyValueStore.set(this.key, data);
  }

  delete() {
    return KeyValueStore.remove(this.key);
  }
}
