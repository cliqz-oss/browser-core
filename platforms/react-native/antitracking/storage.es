/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AsyncStorage } from 'react-native';

const PREFIX = '@cliqzstorage:';

export default {

  getItem(id) {
    return AsyncStorage.getItem(PREFIX + id);
  },

  setItem(id, value) {
    return AsyncStorage.setItem(PREFIX + id, value);
  },

  removeItem(id) {
    return AsyncStorage.removeItem(PREFIX + id);
  },

  clear() {
    AsyncStorage.clear();
  }
};
