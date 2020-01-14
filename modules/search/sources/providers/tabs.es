/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import normalize from '../operators/normalize';

import BaseProvider from './base';

export default class Tabs extends BaseProvider {
  constructor({ tabs }) {
    super('tabs');

    this.browserTabs = tabs;
    this.activeTab = -1;
    this.tabs = new Map();
  }

  onTabCreated = (tab) => {
    this.tabs.set(tab.id, tab);
  };

  onTabUpdated = (id, _, tab) => {
    this.tabs.set(id, tab);
  };

  onTabRemoved = (id) => {
    this.tabs.delete(id);
  };

  onTabActivated = ({ tabId }) => {
    this.activeTab = tabId;
  };

  init() {
    // Populate current tabs
    this.browserTabs.query({}).then((currentTabs) => {
      for (const tab of currentTabs) {
        if (tab.active) {
          this.activeTab = tab.id;
        }

        this.tabs.set(tab.id, tab);
      }
    });

    // Start listening for tab activity
    this.browserTabs.onCreated.addListener(this.onTabCreated);
    this.browserTabs.onUpdated.addListener(this.onTabUpdated);
    this.browserTabs.onRemoved.addListener(this.onTabRemoved);
    this.browserTabs.onActivated.addListener(this.onTabActivated);
  }

  unload() {
    this.browserTabs.onCreated.removeListener(this.onTabCreated);
    this.browserTabs.onUpdated.removeListener(this.onTabUpdated);
    this.browserTabs.onRemoved.removeListener(this.onTabRemoved);
    this.browserTabs.onActivated.removeListener(this.onTabActivated);
  }

  getListOfTabs(query) {
    const selectedTabs = [];

    for (const tab of this.tabs.values()) {
      if (
        tab.id !== this.activeTab
        && tab.incognito === false
        && (tab.url.includes(query) || tab.title.toLowerCase().includes(query))
      ) {
        selectedTabs.push(tab);
      }
    }

    return selectedTabs;
  }

  search(query, config) {
    if (!query || !config.providers[this.id].isEnabled) {
      return this.getEmptySearch(config);
    }

    return this.getResultsFromArray(
      this.getListOfTabs(query.toLowerCase())
        .sort((tab1, tab2) => tab2.lastAccessed - tab1.lastAccessed) // most recently used first
        .map(tab => normalize({
          originalUrl: tab.url,
          provider: 'tabs',
          style: 'action switchtab',
          text: query,
          title: tab.title,
          type: 'action switchtab',
          url: tab.url,
        })),
      query,
      config,
    );
  }
}
