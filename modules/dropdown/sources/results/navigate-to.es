/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BaseResult from './base';

export default class NavigateToResult extends BaseResult {
  get template() {
    return 'navigate-to';
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    return true;
  }

  get isDeletable() {
    return false;
  }

  get isActionSwitchTab() {
    return false;
  }

  get kind() {
    return ['navigate-to'];
  }

  get displayUrl() {
    return this.rawResult.text;
  }
}
