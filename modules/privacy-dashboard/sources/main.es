/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Signals from './signals';

const PrivacyRep = {
  openingStreamCount: 0,

  onExtensionStart(settings) {
    Signals.init(settings);
  },

  unload() {
  },

  registerStream() {
    if (PrivacyRep.openingStreamCount === 0) {
      Signals.startListening();
    }

    PrivacyRep.openingStreamCount += 1;
    Signals.setStreaming(true);
  },

  unregisterStream() {
    PrivacyRep.openingStreamCount -= 1;
    if (PrivacyRep.openingStreamCount <= 0) {
      PrivacyRep.openingStreamCount = 0;
      Signals.setStreaming(false);
      Signals.stopListening();
    }
  },

  getCurrentData() {
    return Signals.getSignalsToDashboard();
  }
};

export default PrivacyRep;
