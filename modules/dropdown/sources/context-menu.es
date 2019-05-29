import inject from '../core/kord/inject';
import utils from '../core/utils';
import events from '../core/events';
import HistoryManager from '../core/history-manager';
import { getTabsWithUrl, closeTabsWithUrl } from '../core/tabs';
import { dropdownContextMenuSignal } from './telemetry';
import config from '../core/config';
import { copyToClipboard } from '../core/clipboard';
import { getMessage } from '../core/i18n';
import { isGhosteryBrowser, isCliqzBrowser } from '../core/platform';

function reportClick(window, result, { isNewTab, isNewWindow, isPrivateWindow }) {
  events.pub('ui:click-on-url', {
    url: result.url,
    query: result.query,
    rawResult: result,
    isPrivateMode: isPrivateWindow,
    isPrivateResult: utils.isPrivateResultType(result.kind),
    isFromAutocompletedURL: false,
    windowId: utils.getWindowID(window),
    action: 'click',
    target: 'context-menu',
    isNewTab,
    isNewWindow,
    isPrivateWindow,
  });
}

export default class ContextMenu {
  constructor(window, rootElement) {
    this.core = inject.module('core');
    this.window = window;
    this.rootElement = rootElement;
    this.inPrivateMode = utils.isPrivateMode(this.window);
    this.labels = this.getLabels();
  }

  openPopup(contextMenu, ev, x, y) {
    contextMenu.openPopupAtScreen(x, y, false);
  }

  /**
   * Create context menu for given search result and show it
   * @public
   */
  show(result, { x, y }) {
    const contextMenu = this.createMenu(result);
    this.openPopup(contextMenu, {}, x, y);
    dropdownContextMenuSignal({ action: 'open' });
  }

  getLabels() {
    return {
      NEW_TAB: getMessage('cMenuOpenInNewTab'),
      NEW_PRIVATE_TAB: getMessage('cMenuOpenInNewPrivateTab', getMessage('private')),
      NEW_FORGET_TAB: getMessage('cMenuOpenInNewPrivateTab', getMessage('forget')),
      NEW_GHOST_TAB: getMessage('cMenuOpenInNewPrivateTab', getMessage('ghost')),
      NEW_WINDOW: getMessage('cMenuOpenInNewWindow'),
      NEW_PRIVATE_WINDOW: getMessage('cMenuOpenInPrivateWindow', getMessage('private')),
      NEW_FORGET_WINDOW: getMessage('cMenuOpenInPrivateWindow', getMessage('forget')),
      NEW_GHOST_WINDOW: getMessage('cMenuOpenInPrivateWindow', getMessage('ghost')),
      COPY_URL: getMessage('cMenuCopyLinkLocation'),
      REMOVE_FROM_HISTORY: getMessage('cMenuRemoveFromHistory'),
      REMOVE_FROM_HISTORY_BOOKMARKS_AND_CLOSE: getMessage('cMenuRemoveFromHistoryAndBookmarksAndCloseTab'),
      REMOVE_FROM_HISTORY_AND_BOOKMARKS: getMessage('cMenuRemoveFromBookmarksAndHistory'),
      REMOVE_FROM_HISTORY_AND_CLOSE: getMessage('cMenuRemoveFromHistoryAndCloseTab'),
      FEEDBACK: getMessage('cMenuFeedback'),
    };
  }

  createMenuItems(result) {
    const url = result.historyUrl;
    const isBookmarked = result.isBookmark;
    const labels = this.labels;
    const openedTabs = getTabsWithUrl(this.window, url);
    const isOpened = !!openedTabs.length;
    let PRIVATE_NAME = 'PRIVATE';

    if (isCliqzBrowser) {
      PRIVATE_NAME = 'FORGET';
    } else if (isGhosteryBrowser) {
      PRIVATE_NAME = 'GHOST';
    }

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
        command: this._open.bind(this, url, result, 'open_new_tab', {
          isNewTab: true,
          isNewWindow: false,
          isPrivateWindow: utils.isPrivateMode(this.window),
        }),
      },
      ...(this.inPrivateMode ? [] : [{
        label: labels.NEW_WINDOW,
        command: this._open.bind(this, url, result, 'open_new_window', {
          isNewTab: false,
          isNewWindow: true,
          isPrivateWindow: utils.isPrivateMode(this.window),
        }),
      }]),
      {
        label: labels[`NEW_${PRIVATE_NAME}_WINDOW`],
        command: this._open.bind(this, url, result, 'open_private_window', {
          isNewTab: false,
          isNewWindow: false,
          isPrivateWindow: utils.isPrivateMode(this.window),
        }),
      },
      {
        label: labels.COPY_URL,
        command: this.copyURL.bind(this, url)
      },
      ...(result.isDeletable ? [{
        label: REMOVE_ENTRY_LABEL,
        command: this.removeEntry.bind(this, result),
      }] : []),
      {
        label: labels.FEEDBACK,
        command: this.openFeedback.bind(this, result.kind)
      }];

    return menuItems;
  }

  createMenu(result) {
    const doc = this.window.document;
    const contextMenu = doc.createElement('menupopup');

    this.rootElement.appendChild(contextMenu);
    contextMenu.setAttribute('id', 'dropdownContextMenu');

    contextMenu.addEventListener('popuphiding', this.onPopupHiding, false);

    this.createMenuItems(result).forEach((item) => {
      const menuItem = doc.createElement('menuitem');
      menuItem.setAttribute('label', item.label);
      menuItem.addEventListener('command', item.command, false);
      menuItem.addEventListener('mouseup', e => e.stopPropagation(), false);
      contextMenu.appendChild(menuItem);
    });
    this.contextMenu = contextMenu;

    return contextMenu;
  }

  onPopupHiding = () => {
    this.contextMenu.removeEventListener('popuphiding', this.onPopupHiding);
    this.rootElement.removeChild(this.contextMenu);
  }

  _open(url, result, signalName, { isNewTab, isNewWindow, isPrivateWindow }) {
    utils.openLink(this.window, url, isNewTab, isNewWindow, isPrivateWindow);
    this.telemetry(signalName);
    reportClick(this.window, result, { isNewTab, isNewWindow, isPrivateWindow });
  }

  copyURL(url) {
    copyToClipboard(url);
  }

  removeEntry({ query, historyUrl, isBookmark }) {
    HistoryManager.removeFromHistory(historyUrl, { strict: false })
      .then(() => {
        const telemetrySignal = isBookmark ? 'remove_from_history_and_bookmarks' : 'remove_from_history';
        this.telemetry(telemetrySignal);
        if (isBookmark) {
          return HistoryManager.removeFromBookmarks(historyUrl);
        }
        return Promise.resolve();
      })
      .then(() => closeTabsWithUrl(historyUrl))
      .then(() => {
        this.core.action('refreshPopup', query);
      });
  }

  openFeedback(kind) {
    utils.openLink(this.window, `${config.settings.FEEDBACK}?kind=${kind}`, true);
    this.telemetry('open_feedback');
  }

  telemetry(target) {
    dropdownContextMenuSignal({ target });
  }
}
