/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';

const window = {
  WebSocket,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription
};

export function getBackgroundWindow() {
  return Promise.resolve(window);
}

export function destroyBackgroundWindow() {
}
