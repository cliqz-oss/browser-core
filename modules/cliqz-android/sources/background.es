/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import Bridge from './native-bridge';

/**
  @namespace cliqz-android
  @module cliqz-android
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  async init() {
    this.bridge = new Bridge();
    await this.bridge.init();

    const idle = performance.now();
    const libsLoaded = idle;
    this.bridge.callAndroidAction('idle', {
      idle,
      libsLoaded,
    });
  },

  unload() {

  },

  events: {

  },

  actions: {
    getInstallDate() {
      return this.bridge.callAndroidAction('getInstallDate');
    }
  },
});
