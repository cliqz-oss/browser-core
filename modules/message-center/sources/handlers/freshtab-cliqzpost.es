/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import events from '../../core/events';
import CliqzMsgHandler from './base';
import inject from '../../core/kord/inject';

export default class CliqzMsgHandlerFreshtabCliqzPost extends CliqzMsgHandler {
  _renderMessage(message) {
    inject.module('freshtab').isReady().then(() => {
      events.pub('message-center:handlers-freshtab:new-message', message);
    }).catch(); // no freshtab, no problem
  }

  _hideMessage(message) {
    events.pub('message-center:handlers-freshtab:clear-message', message);
  }
}
