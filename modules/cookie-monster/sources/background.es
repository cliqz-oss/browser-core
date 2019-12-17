/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Subject, timer, asyncScheduler } from 'rxjs';
import {
  observeOn,
  groupBy,
  flatMap,
  distinctUntilChanged,
  debounceTime,
  filter,
  bufferTime,
  map,
  auditTime,
} from 'rxjs/operators';
import inject from '../core/kord/inject';
import background from '../core/base/background';
import cookies from '../platform/cookies';
import { parse, getGeneralDomain } from '../core/tlds';
import { truncatedHash } from '../core/helpers/md5';
import console from '../core/console';
import webNavigation from '../platform/webnavigation';
import prefs from '../core/prefs';
import CookieMonster, { cookieId } from './cookie-monster';
import logger from './logger';
import { browser } from '../platform/globals';

// Telemetry schemas
import metrics from './telemetry/metrics';
import analyses from './telemetry/analyses';

const TELEMETRY_PREFIX = 'cookie-monster';

const BATCH_UPDATE_FREQUENCY = 180000;

async function isPrivateTab(tabId) {
  return (await browser.tabs.get(tabId)).incognito;
}

function formatDate(date) {
  return date.toISOString().substring(0, 10);
}

export default background({

  requiresServices: ['telemetry'],
  antitracking: inject.module('antitracking'),

  init() {
    inject.service('telemetry', ['register']).register([
      ...metrics,
      ...analyses,
    ]);

    this.cookieMonster = new CookieMonster(this.isTrackerDomain.bind(this), {
      expireSession: prefs.get('cookie-monster.expireSession', false),
      nonTracker: prefs.get('cookie-monster.nonTracker', false),
      trackerLocalStorage: prefs.get('cookie-monster.trackerLocalStorage', false),
    }, this.telemetry.bind(this));

    this.subjectCookies = new Subject();
    this.onCookieChanged = (changeInfo) => {
      this.subjectCookies.next(changeInfo);
    };
    this.subjectPages = new Subject();
    this.onPage = this.onPage.bind(this);
    cookies.onChanged.addListener(this.onCookieChanged);

    // listen for page loads on tracker domains
    webNavigation.onCommitted.addListener(this.onPage);

    // filter page loads: must stay on site for 10s before it is logged
    this.pageStream = this.subjectPages.pipe(
      observeOn(asyncScheduler),
      groupBy(({ tabId }) => tabId, undefined, () => timer(10000)),
      flatMap(group => group.pipe(
        distinctUntilChanged((a, b) => a.domain === b.domain),
        debounceTime(10000)
      ))
    )
      .subscribe((visit) => {
        logger.debug('visit to tracker domain', visit);
        this.cookieMonster.addVisit(visit.domain);
      });

    // filter modified cookies for ones from trackers
    // batches and groups them to remove duplicates

    const batchObservable = this.subjectCookies.pipe(
      observeOn(asyncScheduler),
      filter(({ cookie }) => {
        if (['firefox-private', '1'].indexOf(cookie.storeId) !== -1) {
          // skip private tab cookies
          return false;
        }
        return this.cookieMonster.shouldObserve(cookie);
      }),
      groupBy(({ cookie }) => cookieId(cookie), undefined, () => timer(30000)),
      flatMap(group => group.pipe(auditTime(10000))),
      bufferTime(BATCH_UPDATE_FREQUENCY),
      filter(group => group.length > 0)
    );

    this.trackerCookiesStream = batchObservable
      .subscribe((ckis) => {
        this.onCookieBatch(ckis);
      });

    const initDb = this.cookieMonster.init();
    const initTrackerList = this.antitracking.action('getWhitelist').then((qsWhitelist) => {
      this.trackers = qsWhitelist;
    }).catch(() => logger.warn('antitracking not available, running limited policy set.'));

    // trigger pruning after first batch on startup, or when the date changes
    this.pruneStream = batchObservable.pipe(
      map(() => formatDate(new Date())),
      distinctUntilChanged()
    )
      .subscribe(() => {
        this.cookieMonster.pruneDb();
        if (this.cookieMonster.trackerLSOPruningEnabled) {
          this.cookieMonster.pruneLocalStorage();
        }
      });

    return Promise.all([initDb, initTrackerList]);
  },

  unload() {
    cookies.onChanged.removeListener(this.onCookieChanged);
    clearTimeout(this.initialRun);
    this.trackerCookiesStream.unsubscribe();
    this.pruneStream.unsubscribe();
    this.pageStream.unsubscribe();
    webNavigation.onCommitted.removeListener(this.onPage);
    this.cookieMonster.unload();
  },

  telemetry(signal, value) {
    logger.debug('telemetry', signal, value);
    return inject.service('telemetry', ['push']).push(value, `${TELEMETRY_PREFIX}.${signal}`).catch((e) => {
      console.error('anolysis error', e);
    });
  },

  async onPage({ url, tabId, frameId }) {
    const { domain, hostname } = parse(url);
    if (frameId !== 0) {
      // non main frame
      // if LSO pruning is enabled, notify CM of a new frame which may have data to prune
      if (this.cookieMonster && this.cookieMonster.trackerLSOPruningEnabled
          && domain && this.trackers.isTrackerDomain(truncatedHash(domain))) {
        // check if this is a first-party frame
        const tab = await browser.tabs.get(tabId);
        if (tab && tab.incognito) {
          return;
        }
        const firstParty = !!tab && getGeneralDomain(tab.url) === domain;
        this.cookieMonster.onFrame({ domain, hostname, firstParty });
      }
      return;
    }
    if (domain && this.trackers
        && this.trackers.isTrackerDomain(truncatedHash(domain))) {
      // do not register private tabs
      // on webextensions check tab API, on firefox use details.isPrivate
      if (await isPrivateTab(tabId)) {
        return;
      }
      this.subjectPages.next({
        tabId,
        domain,
      });
    }
  },

  onCookieBatch(ckis) {
    return this.cookieMonster.processBatch(ckis);
  },

  isTrackerDomain(domain) {
    if (!this.trackers) {
      return false;
    }
    return this.trackers.isTrackerDomain(truncatedHash(domain));
  },

  events: {},

  actions: {
  },
});
