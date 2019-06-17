import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getMessage } from '../core/i18n';
import telemetry from '../core/services/telemetry';
import { chrome } from '../platform/globals';
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
    chrome.contextMenus.remove('remove-from-history');
    if (!info.contexts.includes('link')
      || info.pageUrl !== DROPDOWN_URL
      // "about: pages are not real history results and cannot be removed
      || info.linkUrl.startsWith('about:')) {
      return;
    }
    const { hovered } = await chrome.omnibox2.getResult();
    this._hoveredResult = hovered;
    if (this._hoveredResult && this._hoveredResult.isDeletable) {
      const title = getContextMenuTitleForResult(this._hoveredResult);
      await chrome.contextMenus.create({
        id: 'remove-from-history',
        title,
        icons: null,
        contexts: ['link']
      });
    }
    chrome.contextMenus.refresh();
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
          chrome.omnibox2.query(query);
        });
    }
  },

  init() {
    chrome.omnibox2.override({ placeholder: getMessage('freshtab_urlbar_placeholder') });
    this.onTelemetryPush = (signal) => {
      telemetry.push(signal.data);
    };
    chrome.omnibox2.onTelemetryPush.addListener(this.onTelemetryPush);

    this.onContextMenuShown = this._onContextMenuShown.bind(this);
    this.onContextMenuItemClicked = this._onContextMenuItemClicked.bind(this);
    this.onContextMenuHidden = this._onContextMenuHidden.bind(this);
    chrome.contextMenus.onShown.addListener(this.onContextMenuShown);
    chrome.contextMenus.onHidden.addListener(this.onContextMenuHidden);
    chrome.contextMenus.onClicked.addListener(this.onContextMenuItemClicked);
  },

  unload() {
    chrome.contextMenus.onShown.removeListener(this.onContextMenuShown);
    chrome.contextMenus.onHidden.removeListener(this.onContextMenuHidden);
    chrome.contextMenus.onClicked.removeListener(this.onContextMenuItemClicked);
    chrome.omnibox2.onTelemetryPush.removeListener(this.onTelemetryPush);
    chrome.omnibox2.restore();
  }
});
