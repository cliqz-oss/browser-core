/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import CONFIG from '../../core/config';
import { getResourceUrl } from '../../core/platform';

import normalize from '../operators/normalize';

import BaseProvider from './base';

const sessionsUrl = query => ([
  getResourceUrl(CONFIG.settings.HISTORY_URL),
  '#/',
  CONFIG.settings['modules.history.search-path'],
  encodeURIComponent(query),
].join(''));

export default class HistoryView extends BaseProvider {
  constructor() {
    super('historyView');
  }

  search(query, config) {
    if (!query || !config.providers[this.id].isEnabled) {
      return this.getEmptySearch(config, query);
    }

    return this.getResultsFromArray([normalize({
      provider: this.id,
      url: sessionsUrl(query),
      text: query,
      query,
      data: {
        kind: ['history-ui'],
        template: 'sessions',
      },
    })]);
  }
}
