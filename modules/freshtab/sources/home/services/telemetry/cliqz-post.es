/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from './base';

export function messageClickSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'post',
    action: 'click',
    target: 'ok',
    topic: messageId
  });
}

export function messagShowSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'post',
    action: 'show',
    topic: messageId
  });
}
