/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from '../../core/services/telemetry';

const TELEMETRY_VERSION = 2;

export default function uiTourSignal({ action, target }) {
  const signal = {
    type: 'notification',
    version: TELEMETRY_VERSION,
    topic: 'video_downloader',
    view: 'urlbar',
    action,
  };

  if (target) {
    signal.target = target;
  }

  telemetry.push(signal);
}
