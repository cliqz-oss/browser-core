/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../core/kord/inject';
import config from '../core/config';
import pacemaker from '../core/services/pacemaker';
import History from '../platform/history/history';
import { getActiveTab, openLink, getWindow } from '../core/browser';
import HistoryService from '../core/history-service';
import background from '../core/base/background';
import createHistoryDTO from './history-dto';
import { equals, parse } from '../core/url';
import LRU from '../core/LRU';
import migrate from './history-migration';
import { isCliqzBrowser, getResourceUrl } from '../core/platform';
import prefs from '../core/prefs';

const NEW_TAB_URL = getResourceUrl(config.settings.NEW_TAB_URL);
const HISTORY_URL = getResourceUrl(config.settings.HISTORY_URL);

const CLIQZ_INTERFACE_PAGES = [
  NEW_TAB_URL,
  HISTORY_URL,
  getResourceUrl(config.settings.ONBOARDING_URL),
];

/**
* @namespace history
* @class Background
*/
export default background({
  requiresServices: ['logos', 'pacemaker'],
  core: inject.module('core'),
  /**
  * @method init
  */
  init() {
    this.history = History;
    this.redirectMap = new LRU(100);

    if (HistoryService && HistoryService.onVisitRemoved) {
      this.onVisitRemovedListener = this._onVisitRemovedListener.bind(this);
      this.onVisitedListener = this._onVisitedListener.bind(this);
      this.onRedirectListener = this._onRedirectListener.bind(this);

      HistoryService.onVisitRemoved.addListener(this.onVisitRemovedListener);
      HistoryService.onVisited.addListener(this.onVisitedListener);
      chrome.webRequest.onBeforeRedirect.addListener(this.onRedirectListener, {
        urls: ['*://*/*'],
        types: ['main_frame'],
      });
      chrome.webRequest.onCompleted.addListener(this.onRedirectListener, {
        urls: ['*://*/*'],
        types: ['main_frame'],
      });
    }

    if (isCliqzBrowser && !prefs.get('modules.history.cleanupComplete', false)) {
      // Clean empty search sessions from history in order to get rid of the potentialy
      // unsafe searches. We perform this operation once as it can be very expensive for
      // profiles with a large history.
      prefs.set('modules.history.cleanupComplete', true);
      this.history.cleanupEmptySearches();
    }
    this.dbMigration = migrate();
  },

  unload() {
    if (this.onVisitRemovedListener) {
      HistoryService.onVisitRemoved.removeListener(this.onVisitRemovedListener);
      HistoryService.onVisited.removeListener(this.onVisitedListener);
      this.onVisitRemovedListener = null;
      this.onVisitedListener = null;
    }

    this.dbMigration.dispose();
  },

  _onRedirectListener({ url, originUrl, redirectUrl }) {
    if (redirectUrl) {
      this.redirectMap.set(redirectUrl, url);
    }

    if (originUrl) {
      this.redirectMap.set(url, originUrl);
    }
  },

  _onVisitRemovedListener(...args) {
    getActiveTab().then(({ id, url }) => {
      if (url.indexOf(HISTORY_URL) !== 0) {
        return;
      }

      this.core.action(
        'callContentAction', 'history', 'updateHistoryUrls', { windowId: id }, args,
      );
    });
  },

  _onVisitedListener({ url }) {
    const isCliqzInterfacePage = CLIQZ_INTERFACE_PAGES.find(page => url.startsWith(page));
    if (isCliqzInterfacePage) {
      HistoryService.deleteUrl({ url });
      return;
    }
    const sourceUrl = this.getSourceUrl(url);
    if (url && sourceUrl && (!equals(url, sourceUrl))) {
      this.fillFromVisit(url, sourceUrl);
    }
  },

  getSourceUrl(url, path = []) {
    const sourceUrl = this.redirectMap.get(url);

    if (!sourceUrl) {
      return url;
    }

    // Avoid loops, it is not perfect but must do for now
    if (path.indexOf(sourceUrl) >= 0) {
      return sourceUrl;
    }

    return this.getSourceUrl(sourceUrl, [
      ...path,
      sourceUrl,
    ]);
  },

  fillFromVisit(url, triggeringUrl) {
    const uri = parse(url);
    if (uri === null) {
      return Promise.resolve();
    }

    const originalUrl = uri.href;
    const path = uri.pathname;
    const scheme = uri.scheme;

    let cleanUrl = originalUrl;

    // normalize url
    if (!scheme) {
      cleanUrl = `http://${originalUrl}`;
    }
    if (!path) {
      cleanUrl += '/';
    }
    return this.history.fillFromVisit(cleanUrl, triggeringUrl);
  },

  onResult({ query, url, isPrivateMode, isFromAutocompletedURL }) {
    if (isPrivateMode || !url || isFromAutocompletedURL || !query || query === url) {
      return;
    }

    const queryUrl = `https://cliqz.com/search?q=${encodeURIComponent(query)}`;
    const visitTime = Date.now();

    this.history.addVisit({
      url: queryUrl,
      title: `${query} - Cliqz Search`,
      visitTime
    }).then(() => {
      // TODO don't
      pacemaker.setTimeout(() => {
        this.fillFromVisit(url, queryUrl).then(({ visitId, success }) => {
          if (!success || !visitId) {
            // If there is no visitId, it may be Automatic Forget Tab
            // taking over this url load, in such case we remove 'Cliqz Search'
            // visit from history
            const triggeringVisitTimestamp = visitTime * 1000;
            this.history.deleteVisit(triggeringVisitTimestamp);
          }
        });
      }, 2000);
      History.markAsHidden(queryUrl);
    });
  },

  events: {
    /**
    * @event ui:click-on-url
    * @param data
    */
    'ui:click-on-url': function onUIClick({ query, url, isPrivateMode, isFromAutocompletedURL }) {
      this.onResult({ query, url, isPrivateMode, isFromAutocompletedURL });
    },
  },

  actions: {
    getHistory({ frameStartsAt, frameEndsAt, limit, domain, query }) {
      let sessionLimit = limit;
      // Allow unlimited queries only for fixed time fames
      if (!(frameStartsAt && frameEndsAt)) {
        sessionLimit = sessionLimit || 100;
      }

      return this.history.query({
        limit: sessionLimit,
        frameStartsAt,
        frameEndsAt,
        domain,
        query,
      }).then(({ places, from, to }) => {
        const extRootUrl = chrome.extension.getURL('/');
        const refinedPlaces = places.filter(place =>
          place && place.url.startsWith(extRootUrl) === false);
        const dtoP = createHistoryDTO({ places: refinedPlaces });

        return dtoP.then(dto => (
          { frameStartsAt: from,
            frameEndsAt: to,
            ...dto }));
      });
    },

    newTab() {
      openLink(null, NEW_TAB_URL);
    },

    deleteVisit(visitId) {
      return this.history.deleteVisit(visitId);
    },

    deleteVisits(visitIds) {
      return this.history.deleteVisits(visitIds);
    },

    showHistoryDeletionPopup() {
      return this.history.showHistoryDeletionPopup(getWindow());
    },

    sendUserFeedback(data) {
      this.core.action('sendUserFeedback', data);
    },

    getConstUrls() {
      return ({ NEW_TAB_URL });
    }
  },
});
