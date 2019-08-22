/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from './globals';
import { getUrlVariations } from '../core/url';

export default {
  removeFromHistory(urlToRemove, { strict } = { strict: true }) {
    const urls = strict ? [urlToRemove] : getUrlVariations(urlToRemove);
    return Promise.all(urls.map(url =>
      new Promise(resolve => chrome.history.deleteUrl({
        url
      }, resolve))));
  },

  removeFromBookmarks(url) {
    return new Promise((resolve) => {
      chrome.bookmarks.search({ url }, (nodes) => {
        Promise.all(nodes.map(
          node => new Promise(res => chrome.bookmarks.remove(node.id, res))
        )).then(resolve);
      });
    });
  }
};
