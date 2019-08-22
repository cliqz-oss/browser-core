/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NetInfo } from 'react-native';

const networkStatus = {
  type: 'unknown', // types: none, wifi, cellular, unknown
};

const onConnectionChange = (connectionInfo) => {
  networkStatus.type = connectionInfo.type;
};

export function addConnectionChangeListener() {
  NetInfo.addEventListener(
    'connectionChange',
    onConnectionChange
  );
}

export function removeConnectionChangeListener() {
  NetInfo.removeEventListener(
    'connectionChange',
    onConnectionChange
  );
}


export default networkStatus;
