import inject from '../core/kord/inject';
import utils from '../core/utils';
import events from '../core/events';
import HistoryManager from '../core/history-manager';
import { getTabsWithUrl, closeTab } from '../core/tabs';
import { dropdownContextMenuSignal } from './telemetry';
import config from '../core/config';
import { copyToClipboard } from '../core/clipboard';

function reportClick(window, result) {
  events.pub('ui:click-on-url', {
    url: result.url,
    query: result.query,
    rawResult: result.rawResult,
    isPrivateMode: utils.isPrivateMode(window),
    isPrivateResult: utils.isPrivateResultType(result.kind),
    isFromAutocompletedURL: false,
    windowId: utils.getWindowID(window),
    action: 'click',
    target: 'context-menu',
  });
}

export default class ContextMenu {
  constructor(window, rootElement) {
    this.core = inject.module('core');
    this.window = window;
    this.rootElement = rootElement;
    this.inPrivateMode = utils.isPrivateMode(window);
    this.labels = this.getLocalizedStrings();
  }

  /**
   * Create context menu for given search result and show it
   * @public
   */
  show(result, { x, y }) {
    const url = utils.cleanMozillaActions(result.url)[1];

    HistoryManager.isBookmarked(url).then((isBookmarked) => {
      const contextMenu = this.createMenu(result, url, isBookmarked);
      utils.openPopup(contextMenu, {}, x, y);
      dropdownContextMenuSignal({ action: 'open' });
    });
  }

  getLocalizedStrings() {
    return {
      NEW_TAB: utils.getLocalizedString('cMenuOpenInNewTab'),
      NEW_PRIVATE_TAB: utils.getLocalizedString('cMenuOpenInNewPrivateTab', utils.getLocalizedString('private')),
      NEW_FORGET_TAB: utils.getLocalizedString('cMenuOpenInNewPrivateTab', utils.getLocalizedString('forget')),
      NEW_WINDOW: utils.getLocalizedString('cMenuOpenInNewWindow'),
      NEW_PRIVATE_WINDOW: utils.getLocalizedString('cMenuOpenInPrivateWindow', utils.getLocalizedString('private')),
      NEW_FORGET_WINDOW: utils.getLocalizedString('cMenuOpenInPrivateWindow', utils.getLocalizedString('forget')),
      COPY_URL: utils.getLocalizedString('cMenuCopyLinkLocation'),
      REMOVE_FROM_HISTORY: utils.getLocalizedString('cMenuRemoveFromHistory'),
      REMOVE_FROM_HISTORY_BOOKMARKS_AND_CLOSE: utils.getLocalizedString('cMenuRemoveFromHistoryAndBookmarksAndCloseTab'),
      REMOVE_FROM_HISTORY_AND_BOOKMARKS: utils.getLocalizedString('cMenuRemoveFromBookmarksAndHistory'),
      REMOVE_FROM_HISTORY_AND_CLOSE: utils.getLocalizedString('cMenuRemoveFromHistoryAndCloseTab'),
      FEEDBACK: utils.getLocalizedString('cMenuFeedback'),
    };
  }

  createMenuItems(result, url, isBookmarked) {
    const labels = this.labels;
    const openedTabs = getTabsWithUrl(this.window, url);
    const isOpened = !!openedTabs.length;
    const isCliqzBrowser = config.settings.channel === '40';
    const PRIVATE_NAME = isCliqzBrowser ? 'FORGET' : 'PRIVATE';

    let REMOVE_ENTRY_LABEL = labels.REMOVE_FROM_HISTORY;
    if (isBookmarked && isOpened) {
      REMOVE_ENTRY_LABEL = labels.REMOVE_FROM_HISTORY_BOOKMARKS_AND_CLOSE;
    } else if (isBookmarked && !isOpened) {
      REMOVE_ENTRY_LABEL = labels.REMOVE_FROM_HISTORY_AND_BOOKMARKS;
    } else if (!isBookmarked && isOpened) {
      REMOVE_ENTRY_LABEL = labels.REMOVE_FROM_HISTORY_AND_CLOSE;
    }

    const menuItems = [
      {
        label: this.inPrivateMode ? labels[`NEW_${PRIVATE_NAME}_TAB`] : labels.NEW_TAB,
        command: this.openNewTab.bind(this, url, result),
      },
      ...(this.inPrivateMode ? [] : [{
        label: labels.NEW_WINDOW,
        command: this.openNewWindow.bind(this, url, result),
      }]),
      {
        label: labels[`NEW_${PRIVATE_NAME}_WINDOW`],
        command: this.openInPrivateWindow.bind(this, url, result),
      },
      {
        label: labels.COPY_URL,
        command: this.copyURL.bind(this, url)
      },
      ...(result.isDeletable ? [{
        label: REMOVE_ENTRY_LABEL,
        command: this.removeEntry.bind(this, url, result, openedTabs),
      }] : []),
      {
        label: labels.FEEDBACK,
        command: this.openFeedback.bind(this, result.kind)
      }];

    return menuItems;
  }

  createMenu(result, url, isBookmarked) {
    const doc = this.window.document;
    const contextMenu = doc.createElement('menupopup');

    this.rootElement.appendChild(contextMenu);
    contextMenu.setAttribute('id', 'dropdownContextMenu');

    this.createMenuItems(result, url, isBookmarked).forEach((item) => {
      const menuItem = doc.createElement('menuitem');
      menuItem.setAttribute('label', item.label);
      menuItem.addEventListener('command', item.command, false);
      menuItem.addEventListener('mouseup', e => e.stopPropagation(), false);
      contextMenu.appendChild(menuItem);
    });

    return contextMenu;
  }

  openNewWindow(url, result) {
    utils.openLink(this.window, url, false, true);
    this.telemetry('open_new_window');
    reportClick(this.window, result);
  }

  openNewTab(url, result) {
    utils.openLink(this.window, url, true);
    this.telemetry('open_new_tab');
    reportClick(this.window, result);
  }

  openInPrivateWindow(url, result) {
    utils.openLink(this.window, url, false, false, true);
    this.telemetry('open_private_window');
    reportClick(this.window, result);
  }

  copyURL(url) {
    copyToClipboard(url);
  }

  removeEntry(url, { query }, openedTabs = []) {
    HistoryManager.removeFromHistory(url);
    if (HistoryManager.isBookmarked(url)) {
      HistoryManager.removeFromBookmarks(url);
      this.telemetry('remove_from_history_and_bookmarks');
    } else {
      this.telemetry('remove_from_history');
    }
    if (openedTabs.length) {
      openedTabs.forEach(tab => closeTab(this.window, tab));
    }
    this.core.action('refreshPopup', query);
  }

  openFeedback(kind) {
    utils.openLink(this.window, `${utils.FEEDBACK}?kind=${kind}`, true);
    this.telemetry('open_feedback');
  }

  telemetry(target) {
    dropdownContextMenuSignal({ target });
  }
}
