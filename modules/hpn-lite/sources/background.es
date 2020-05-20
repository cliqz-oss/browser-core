/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';

import HpnLite from './hpn-lite';
import { InvalidMessageError, ModuleDisabled } from './errors';

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  // Global instance
  hpnLite: null,

  requiresServices: [
    'storage',
  ],

  async init(config, browser, { services }) {
    const storage = services.storage;
    this.hpnLite = new HpnLite({ config, storage });
  },

  unload() {
    this.hpnLite = null;
  },

  events: {},

  actions: {
    async send(msg) {
      if (!msg || typeof msg !== 'object') {
        throw new InvalidMessageError('Input message must be an object');
      }
      if (!msg.action) {
        throw new InvalidMessageError('Mandatory field "action" is missing');
      }
      if (!this.hpnLite) {
        throw new ModuleDisabled('Module is not properly initialized');
      }
      return this.hpnLite.proxiedHttp.send({
        body: JSON.stringify(msg)
      });
    }
  },
});
