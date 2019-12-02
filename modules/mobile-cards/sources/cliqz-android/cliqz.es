/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RemoteActionProvider from '../../core/helpers/remote-action-provider';
import createModuleWrapper from '../../core/helpers/action-module-wrapper';

export default class Cliqz {
  constructor(actions = {}) {
    this.mobileCards = createModuleWrapper('mobile-cards');
    this.core = createModuleWrapper('core');
    this.search = createModuleWrapper('search');
    this.geolocation = createModuleWrapper('geolocation');

    // Exported actions
    this.actions = new RemoteActionProvider('mobile-cards', actions);
    this.actions.init();
  }

  init() {
    window.addEventListener('unload', () => {
      this.actions.unload();
    });
  }
}
