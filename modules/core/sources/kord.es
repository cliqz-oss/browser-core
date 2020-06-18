/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject, { getModuleList, setGlobal as injectSetGlobal } from './kord/inject';

export default {
  inject,
  get modules() {
    return getModuleList();
  },
};

export function setApp(app) {
  injectSetGlobal(app);
}
