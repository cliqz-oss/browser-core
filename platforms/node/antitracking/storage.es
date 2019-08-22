/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { readFile, writeFile } from '../fs';

const PREFIX = 'attrack-store';

export default {

  getItem(id) {
    return readFile(`${PREFIX}/${id}`).catch(() => '{}');
  },

  setItem(id, value) {
    return writeFile(`${PREFIX}/${id}`, value);
  },

  removeItem() {
    return Promise.resolve();
  },

  clear() {
  }
};
