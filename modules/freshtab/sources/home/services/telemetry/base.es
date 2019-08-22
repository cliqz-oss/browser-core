/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import cliqz from '../../cliqz';

const isPrivateMode = !!(chrome && chrome.extension && chrome.extension.inIncognitoContext);

export default function (signal) {
  if (!isPrivateMode) {
    cliqz.core.sendTelemetry(
      { ...signal, version: '2.0' },
      false, // not instant push
      '',
    );
  }
}
