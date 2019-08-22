/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import events from '../core/events';
import console from './console';

const osAPI = {
  deviceARN(...args) {
    console.log('[not implemented] deviceARN', ...args);
  },
  notifyPairingSuccess(x) {
    events.pub('mobile-pairing:notifyPairingSuccess', x);
  },
  notifyPairingError(x) {
    events.pub('mobile-pairing:notifyPairingError', x);
  },
  pushPairingData(x) {
    events.pub('mobile-pairing:pushPairingData', x);
  },
  openTab(x) {
    events.pub('mobile-pairing:openTab', x);
  },
  downloadVideo(x) {
    events.pub('mobile-pairing:downloadVideo', x);
  },
  notifyTabError(x) {
    events.pub('mobile-pairing:notifyTabError', x);
  },
  notifyTabSuccess(x) {
    events.pub('mobile-pairing:notifyTabSuccess', x);
  },
};

export default osAPI;
