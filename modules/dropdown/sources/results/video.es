/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Subresult } from './base';

export default class VideoResult extends Subresult {
  get friendlyUrl() {
    return this.rawResult.friendlyUrl;
  }

  get videoViews() {
    return this.rawResult.views;
  }

  secondsToDuration(s) {
    if (!s) {
      return null;
    }

    const date = new Date(null);
    date.setSeconds(s);
    let result = date.toISOString().substr(11, 8);
    if (result.indexOf('00:') === 0) {
      result = result.substr(3, 5);
    }

    return result;
  }

  get duration() {
    return this.secondsToDuration(this.rawResult.duration);
  }

  get isVideo() {
    return true;
  }

  get thumbnail() {
    return this.rawResult.thumbnail;
  }

  get logo() {
    if (this.rawResult.isSingleVideo) {
      return super.logo;
    }

    return null;
  }
}
