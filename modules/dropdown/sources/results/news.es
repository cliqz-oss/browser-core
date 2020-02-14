/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Subresult } from './base';
import { NEWS_RESULT, BREAKING_NEWS_RESULT } from '../result-types';

const brokenNewsThumbnails = new Set();

export default class NewsResult extends Subresult {
  get type() {
    if (this.isBreakingNews) {
      return BREAKING_NEWS_RESULT;
    }

    return NEWS_RESULT;
  }

  get logo() {
    if (this.rawResult.showLogo) {
      return super.logo;
    }

    return null;
  }

  removeInvalidThumbnail(image) {
    if (image.height === 0 || image.naturalHeight === 0) {
      brokenNewsThumbnails.add(image.src);
    }
  }

  didRender($dropdown) {
    const images = $dropdown.querySelectorAll('.thumbnail [data-extra="image"][alt=" "]');
    if (images.length > 0) {
      images.forEach(image => this.removeInvalidThumbnail(image));
    }
  }

  get logoDetails() {
    if (this.thumbnail === '' || brokenNewsThumbnails.has(this.thumbnail)) {
      return super.logo;
    }

    return null;
  }

  get thumbnail() {
    return this.rawResult.thumbnail || ''; // Always show thumbnail
  }

  get tweetCount() {
    return this.rawResult.tweet_count;
  }

  get publishedAt() {
    return this.rawResult.creation_time;
  }

  get friendlyUrl() {
    return this.rawResult.domain;
  }

  get isBreakingNews() {
    return this.rawResult.isBreakingNews;
  }
}
