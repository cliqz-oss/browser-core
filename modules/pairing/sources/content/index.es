/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global window */

import RemoteActionProvider from '../../core/helpers/remote-action-provider';
import createModuleWrapper from '../../core/helpers/action-module-wrapper';
import checkIfChromeReady from '../../core/content/ready-promise';

import PairingUI from './ui';

class Cliqz {
  constructor() {
    this.pairing = createModuleWrapper('pairing');
    this.core = createModuleWrapper('core');

    const UI = new PairingUI();

    this.actions = new RemoteActionProvider('pairing', {
      onPairingInit(message) {
        UI.oninit(message);
      },
      onPairingDeviceAdded(message) {
        UI.ondeviceadded(message);
      },
      onPairingStarted(message) {
        UI.onpairing(message);
      },
      onPairingDone(message) {
        UI.onpaired(message);
      },
      onPairingRemoved(message) {
        UI.onunpaired(message);
      },
      onPairingMasterConnected(message) {
        UI.onmasterconnected(message);
      },
      onPairingMasterDisconnected(message) {
        UI.onmasterdisconnected(message);
      },
    });

    checkIfChromeReady().then(() => {
      this.actions.init();
      UI.init(window, this.pairing, this.core.sendTelemetry.bind(this.core));
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });
  }
}

window.Cliqz = new Cliqz();
