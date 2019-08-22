/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PairingObserver from './pairing-observer';

export default class YoutubeApp extends PairingObserver {
  constructor(changeCallback, onVideoReceived) {
    super(changeCallback);
    this.onVideoReceived = onVideoReceived;
  }

  onmessage(msg, source) {
    if (this.onVideoReceived) {
      this.onVideoReceived(msg, source);
    }
  }

  // format should be the extension (mp4, etc.)
  sendVideo({ url, title, format }, deviceID) {
    return this.comm.send({ url, title, format }, deviceID || this.comm.masterID);
  }
}
