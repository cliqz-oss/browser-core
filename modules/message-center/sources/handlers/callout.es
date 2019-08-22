/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getWindow } from '../../core/browser';
import CliqzMsgHandler from './base';
import UITour from '../../platform/ui-tour';

export default class CliqzMsgHandlerCallout extends CliqzMsgHandler {
  _renderMessage(message) {
    UITour.targets.set(message.target, { query: `#${message.target}`, widgetName: message.target, allowAdd: true });
    const targetPromise = UITour.getTarget(getWindow(), message.target);
    targetPromise.then((target) => {
      setTimeout(() => {
        UITour.showInfo(getWindow(), target,
          message.title,
          message.text,
          '',
          message.buttons);
      }, 1500);
    });
  }

  _hideMessage() {

  }
}
