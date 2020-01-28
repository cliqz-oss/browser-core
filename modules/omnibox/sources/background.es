/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getMessage } from '../core/i18n';
import { browser } from '../platform/globals';
import { getResourceUrl } from '../core/platform';
import { hasOpenedTabWithUrl } from '../core/tabs';

const DROPDOWN_URL = getResourceUrl('dropdown/dropdown.html');

function getContextMenuTitleForResult(result) {
  let messageKey = 'cMenuRemoveFromHistory';
  if (result.isBookmark) {
    messageKey += 'AndBookmarks';
  }
  if (hasOpenedTabWithUrl(result.historyUrl, { strict: false })) {
    messageKey += 'AndCloseTab';
  }
  return getMessage(messageKey);
}

export default background({
  dropdown: inject.module('dropdown'),

  async _onContextMenuShown(info) {
    browser.contextMenus.remove('remove-from-history');
    if (!info.contexts.includes('link')
      || info.pageUrl !== DROPDOWN_URL
      // "about: pages are not real history results and cannot be removed
      || info.linkUrl.startsWith('about:')) {
      return;
    }
    const { hovered } = await browser.omnibox2.getResult();
    this._hoveredResult = hovered;
    if (this._hoveredResult && this._hoveredResult.isDeletable) {
      const title = getContextMenuTitleForResult(this._hoveredResult);
      await browser.contextMenus.create({
        id: 'remove-from-history',
        title,
        icons: null,
        contexts: ['link']
      });
    }
    browser.contextMenus.refresh();
  },

  _onContextMenuHidden() {
    this._hoveredResult = null;
  },

  _onContextMenuItemClicked({ menuItemId }) {
    if (menuItemId === 'remove-from-history') {
      const url = this._hoveredResult.historyUrl;
      const query = this._hoveredResult.query;
      this.dropdown
        .action('removeFromHistory', url, {
          strict: false,
          bookmarks: true,
          closeTabs: true,
        })
        .then(() => {
          browser.omnibox2.query(query);
        });
    }
  },

  init() {
    browser.omnibox2.override({ placeholder: getMessage('freshtab_urlbar_placeholder') });

    this.onContextMenuShown = this._onContextMenuShown.bind(this);
    this.onContextMenuItemClicked = this._onContextMenuItemClicked.bind(this);
    this.onContextMenuHidden = this._onContextMenuHidden.bind(this);
    browser.contextMenus.onShown.addListener(this.onContextMenuShown);
    browser.contextMenus.onHidden.addListener(this.onContextMenuHidden);
    browser.contextMenus.onClicked.addListener(this.onContextMenuItemClicked);
  },

  unload() {
    browser.contextMenus.onShown.removeListener(this.onContextMenuShown);
    browser.contextMenus.onHidden.removeListener(this.onContextMenuHidden);
    browser.contextMenus.onClicked.removeListener(this.onContextMenuItemClicked);
    browser.omnibox2.restore();
  }
});
