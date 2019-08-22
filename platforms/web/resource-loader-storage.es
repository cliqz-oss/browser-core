/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { window } from './globals';

export default class Storage {
  constructor(filePath) {
    this.key = [
      'resource-loader',
      ...filePath,
    ].join(':');
  }

  async load() {
    return window.localStorage.getItem(this.key);
  }

  async save(data) {
    return window.localStorage.setItem(this.key, data);
  }
}
