/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import events from '../core/events';
import { chrome } from './globals';

export default class LocationChangeObserver {
  constructor() {
    this.onLocationChangeHandler = ({ tabId, url, frameId, transitionType }) => {
      // We should only forward main_document URLs for on-location change.
      if (frameId !== 0) {
        return;
      }

      // We need to check if the on-location change happened in a private tab.
      // Modules like human-web should not collect data about sites visited in private tab.
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          return;
        }
        const { incognito: isPrivate, active, pinned } = tab;
        events.pub('content:location-change', {
          active,
          frameId,
          isPrivate,
          pinned,
          tabId,
          transitionType,
          url,
          windowId: tabId,
          windowTreeInformation: { tabId }
        });
      });
    };
  }

  init() {
    chrome.webNavigation.onCommitted.addListener(this.onLocationChangeHandler);
    chrome.webNavigation.onHistoryStateUpdated.addListener(this.onLocationChangeHandler);
  }

  unload() {
    chrome.webNavigation.onCommitted.removeListener(this.onLocationChangeHandler);
    chrome.webNavigation.onHistoryStateUpdated.removeListener(this.onLocationChangeHandler);
  }
}
