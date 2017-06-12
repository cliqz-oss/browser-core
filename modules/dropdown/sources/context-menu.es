import inject from '../core/kord/inject';
import utils from '../core/utils';
import HistoryManager from '../core/history-manager';
import { getTabsWithUrl, closeTab } from '../core/tabs';
import { dropdownContextMenuSignal } from './telemetry';
import config from '../core/config';

export default class ContextMenu {
  constructor(window, rootElement) {
    this.core = inject.module('core');
    this.window = window;
    this.rootElement = rootElement;
    this.inPrivateWindow = utils.isPrivate(window);
    this.labels = this.getLocalizedStrings();
  }

  /**
   * Create context menu for given search result and show it
   * @public
   */
  show(result, { x, y }) {
    const contextMenu = this.createMenu(result);
    utils.openPopup(contextMenu, {}, x, y);
    dropdownContextMenuSignal({ action: 'open' });
  }

  getLocalizedStrings() {
    return {
      NEW_TAB: utils.getLocalizedString('cMenuOpenInNewTab'),
      NEW_PRIVATE_TAB: utils.getLocalizedString('cMenuOpenInNewPrivateTab', utils.getLocalizedString('private')),
      NEW_FORGET_TAB: utils.getLocalizedString('cMenuOpenInNewPrivateTab', utils.getLocalizedString('forget')),
      NEW_WINDOW: utils.getLocalizedString('cMenuOpenInNewWindow'),
      NEW_PRIVATE_WINDOW: utils.getLocalizedString('cMenuOpenInPrivateWindow', utils.getLocalizedString('private')),
      NEW_FORGET_WINDOW: utils.getLocalizedString('cMenuOpenInPrivateWindow', utils.getLocalizedString('forget')),
      REMOVE_FROM_HISTORY: utils.getLocalizedString('cMenuRemoveFromHistory'),
      REMOVE_FROM_HISTORY_BOOKMARKS_AND_CLOSE: utils.getLocalizedString('cMenuRemoveFromHistoryAndBookmarksAndCloseTab'),
      REMOVE_FROM_HISTORY_AND_BOOKMARKS: utils.getLocalizedString('cMenuRemoveFromBookmarksAndHistory'),
      REMOVE_FROM_HISTORY_AND_CLOSE: utils.getLocalizedString('cMenuRemoveFromHistoryAndCloseTab'),
      FEEDBACK: utils.getLocalizedString('cMenuFeedback'),
    };
  }

  createMenuItems(result) {
    const url = utils.cleanMozillaActions(result.url)[1];
    const labels = this.labels;
    const isBookmarked = HistoryManager.isBookmarked(url);
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
        label: this.inPrivateWindow ? labels[`NEW_${PRIVATE_NAME}_TAB`] : labels.NEW_TAB,
        command: this.openNewTab.bind(this, url),
      },
      ...(this.inPrivateWindow ? [] : [{
        label: labels.NEW_WINDOW,
        command: this.openNewWindow.bind(this, url),
      }]),
      {
        label: labels[`NEW_${PRIVATE_NAME}_WINDOW`],
        command: this.openInPrivateWindow.bind(this, url),
      },
      ...(result.isDeletable ? [{
        label: REMOVE_ENTRY_LABEL,
        command: this.removeEntry.bind(this, url, result, openedTabs),
      }] : []),
      {
        label: labels.FEEDBACK,
        command: this.openFeedback.bind(this, result.kind),
        class: 'menuitem-iconic',
        icon: `url(${utils.SKIN_PATH}cliqz.png)`,
      }];

    return menuItems;
  }

  createMenu(result) {
    const doc = this.window.document;
    const contextMenu = doc.createElement('menupopup');

    this.rootElement.appendChild(contextMenu);
    contextMenu.setAttribute('id', 'dropdownContextMenu');

    this.createMenuItems(result).forEach((item) => {
      const menuItem = doc.createElement('menuitem');
      menuItem.setAttribute('label', item.label);
      if (item.class) {
        menuItem.setAttribute('class', item.class);
      }
      if (item.icon) {
        menuItem.style.listStyleImage = item.icon;
      }
      menuItem.addEventListener('command', item.command, false);
      menuItem.addEventListener('mouseup', e => e.stopPropagation(), false);
      contextMenu.appendChild(menuItem);
    });

    return contextMenu;
  }

  openNewWindow(url) {
    utils.openLink(this.window, url, false, true);
    this.telemetry('open_new_window');
  }

  openNewTab(url) {
    utils.openLink(this.window, url, true);
    this.telemetry('open_new_tab');
  }

  openInPrivateWindow(url) {
    utils.openLink(this.window, url, false, false, true);
    this.telemetry('open_private_window');
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
    this.core.action('queryCliqz', query);
  }

  openFeedback(kind) {
    utils.openLink(this.window, `${utils.FEEDBACK}?kind=${kind}`, true);
    this.telemetry('open_feedback');
  }

  telemetry(target) {
    dropdownContextMenuSignal({ target });
  }
}
