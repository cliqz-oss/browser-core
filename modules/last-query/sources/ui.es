/*
 * This module remembers the last queries made in a tab and shows
 * them when appropiate
 *
 */

import config from '../core/config';
import { isPlatformAtLeastInVersion } from '../core/platform';

export default class SearchHistoryUI {
  constructor(window, redoQuery) {
    this.tabQueries = new Map();
    this.redoLastQuery = () => redoQuery(this.currentQuery);
    this.window = window;
    this.container = window.document.createElement('hbox');
    this.container.className = 'hidden'; // Initially hide the container
    this.container.setAttribute('min-browser-version-is-58', isPlatformAtLeastInVersion('58.0'));

    // Add last search button to container
    this.queryBox = window.document.createElement('hbox');
    this.queryBox.className = 'cliqz-urlbar-Last-search';
    this.queryBox.addEventListener('click', this.redoLastQuery);
    this.container.appendChild(this.queryBox);
  }

  attach() {
    const $targetPosition = this.window.gURLBar.mInputField.parentElement;
    $targetPosition.insertBefore(this.container, $targetPosition.firstChild);
  }

  deattach() {
    this.tabQueries.clear();
    this.queryBox.removeEventListener('click', this.redoLastQuery);
    try {
      this.container.parentNode.removeChild(this.container);
    } catch (e) {
      // removed already, maybe by some other browser feature
    }
  }

  show(query) {
    if (!query) {
      return;
    }
    this.currentQuery = query;

    this.container.className = 'cliqz-urlbar-Last-search-container';
    this.container.setAttribute('channel', config.settings.channel);

    this.queryBox.textContent = query;
    this.queryBox.tooltipText = query;
    this.queryBox.query = query;
  }

  hide() {
    this.container.className = 'hidden';
  }

  clearTabQuery(tabId) {
    this.tabQueries.delete(tabId);
  }

  updateTabQuery(tabId, query) {
    this.tabQueries.set(tabId, query);
  }

  showTabQuery(tabId) {
    const query = this.tabQueries.get(tabId);
    if (query) {
      this.show(query);
    }
  }
}
