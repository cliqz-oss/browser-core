/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from './base';

export function statsClickSignal(index) {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: 'card',
    index,
  });
}

export function statsHoverSignal(index) {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'hover',
    target: 'card',
    index,
  });
}

export function statsDownloadClickSignal() {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: 'download',
  });
}
