/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BaseResult from './base';

export default class SupplementarySearchResult extends BaseResult {
  isUrlMatch(href) {
    // we need to override isUrlMatch as in some cases the value of
    // 'href' is the bare query and not a full url. Please see the comment
    // from click
    return href === this.suggestion || href === this.url;
  }

  get template() {
    return 'search';
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    // it appears as history if its a default search result or
    // as a regular result if its a suggestion
    return this.defaultSearchResult;
  }

  get isDeletable() {
    return false;
  }

  get icon() {
    return 'search';
  }

  get displayText() {
    return this.rawResult.text;
  }

  get suggestion() {
    return this.rawResult.data.suggestion;
  }

  get query() {
    return this.suggestion;
  }

  get engine() {
    return this.rawResult.data.extra.searchEngineName;
  }

  get defaultSearchResult() {
    return this.rawResult.provider === 'instant';
  }

  get historyUrl() {
    return this.rawResult.url;
  }

  get displayUrl() {
    return this.rawResult.data.suggestion;
  }
}
