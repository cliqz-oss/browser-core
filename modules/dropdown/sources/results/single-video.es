/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GenericResult from './generic';
import VideoResult from './video';

export default class SingleVideoResult extends GenericResult {
  get template() {
    return 'single-video';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get videoResult() {
    const richData = this._extra.rich_data || {};
    const views = richData.views ? Number(richData.views).toLocaleString() : '';
    return new VideoResult(this, {
      url: this.url,
      title: this.title,
      thumbnail: richData.thumbnail,
      duration: richData.duration,
      views,
      isSingleVideo: true,
      text: this.query,
      friendlyUrl: this.friendlyUrl,
    });
  }
}
