/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from './base';

const urlBarBaseSignal = {
  type: 'home',
  target: 'search_bar',
};

export function urlBarFocusSignal() {
  telemetry({
    ...urlBarBaseSignal,
    action: 'focus',
  });
}

export function urlBarBlurSignal() {
  telemetry({
    ...urlBarBaseSignal,
    action: 'blur',
  });
}
