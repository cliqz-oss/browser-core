/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { chrome } from '../platform/globals';
import { getMessage } from '../platform/i18n';
import config from '../core/config';
import inject from '../core/kord/inject';

function triggerOverlay(tab, triggeredBy, query = '') {
  inject.module('core').action(
    'callContentAction', 'overlay', 'toggle-quicksearch', { windowId: tab.id }, {
      trigger: triggeredBy,
      query,
    },
  );
}

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    chrome.contextMenus && chrome.contextMenus.create({
      id: 'context-search',
      title: getMessage('context_menu_search_item', [config.settings.appName, '%s']),
      contexts: ['selection'],
      documentUrlPatterns: [
        'http://*/*',
        'https://*/*',
      ]
    });

    chrome.contextMenus && chrome.contextMenus.onClicked.addListener((info, tab) => {
      triggerOverlay(tab, 'ByContextMenu', info.selectionText);
    });

    chrome.commands.onCommand.addListener(this.onCommand);
  },

  unload() {
    chrome.commands.onCommand.removeListener(this.onCommand);
  },

  beforeBrowserShutdown() {

  },

  onCommand(command) {
    if (command === 'toggle-quicksearch') {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) {
          return;
        }
        triggerOverlay(tab, 'ByKeyboard');
      });
    }
  },

  events: {

  },

  actions: {

  },
});
