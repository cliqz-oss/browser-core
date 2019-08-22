/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getWindow } from '../../core/browser';
import CliqzMsgHandler from './base';

export default class CliqzMsgHandlerAlert extends CliqzMsgHandler {
  _renderMessage(message) {
    // TODO wait for window to open
    getWindow().alert(message.text);
    if (this._callbacks[message.id]) {
      this._callbacks[message.id](message.id, message.options
         && message.options.length > 0 && message.options[0].action);
    }
    this.showNextMessage();
  }

  _hideMessage() {

  }
}
