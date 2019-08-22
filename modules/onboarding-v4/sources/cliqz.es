/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import createModuleWrapper from '../core/helpers/action-module-wrapper';

class Cliqz {
  constructor() {
    this.onboarding = createModuleWrapper('onboarding-v4');
    this.core = createModuleWrapper('core');
    this.state = {};
  }

  setStorage(storage) {
    this.storage = storage;
  }
}

export default new Cliqz();
