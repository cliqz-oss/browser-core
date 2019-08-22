/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import PrivacyRep from './main';

/**
* @namespace privacy-dashboard
* @class Background
*/
export default background({
  requiresServices: ['telemetry'],

  /**
  * @method init
  */
  init(settings) {
    PrivacyRep.onExtensionStart(settings);
  },

  /**
  * @method unload
  */
  unload() {
    PrivacyRep.unload();
  },

  actions: {
    register() {
      PrivacyRep.registerStream();
    },
    unregister() {
      PrivacyRep.unregisterStream();
    },
    getData() {
      return PrivacyRep.getCurrentData();
    }
  }
});
