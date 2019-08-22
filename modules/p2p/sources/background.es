/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { getBackgroundWindow, destroyBackgroundWindow } from '../platform/p2p/window-utils';
import CliqzPeer from './cliqz-peer';

export default background({
  requiresServices: ['pacemaker'],

  init() {
    this.peers = [];
    return getBackgroundWindow()
      .then((w) => {
        this.window = w;
        return w;
      });
  },
  unload() {
    this.peers.forEach((peer) => {
      try {
        peer.destroy();
      } catch (e) {
        // Nothing
      }
    });
    this.peers = [];
    this.window = null;
    destroyBackgroundWindow();
  },
  actions: {
    createPeer(...args) {
      const peer = new CliqzPeer(this.window, ...args);
      this.peers.push(peer);
      return peer;
    },
  }
});
