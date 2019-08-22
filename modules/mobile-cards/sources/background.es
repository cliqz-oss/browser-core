/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';
import {
  openLink,
  callNumber,
  openMap,
  hideKeyboard,
  sendUIReadySignal,
  handleAutocompletion,
  queryCliqz,
} from '../platform/browser-actions';


/**
  @namespace <namespace>
  @class Background
 */
export default background({

  requiresServices: ['logos', 'cliqz-config', 'telemetry'],
  search: inject.module('search'),

  /**
    @method init
    @param settings
  */
  init() {

  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    getConfig(sender) {
      return {
        tabId: sender.tab.id,
      };
    },
    async openLink(url, selection) {
      let isSearchEngine = false;
      if (selection) {
        await this.search.action('reportSelection', selection, { contextId: 'mobile-cards' });
        isSearchEngine = selection.rawResult.type === 'supplementary-search';
      }
      openLink(url, selection.query, isSearchEngine);
    },
    callNumber,
    openMap,
    hideKeyboard,
    sendUIReadySignal,
    handleAutocompletion,
    queryCliqz,
  },
});
