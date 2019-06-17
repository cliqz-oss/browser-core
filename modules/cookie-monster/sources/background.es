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
import { getGeneralDomain } from '../core/tlds';
import md5 from '../core/helpers/md5';
import console from '../core/console';
import WebRequest from '../core/webrequest';
import tabs from '../platform/tabs';
import prefs from '../core/prefs';
import CookieMonster, { cookieId } from './cookie-monster';
import logger from './logger';

const TELEMETRY_PREFIX = 'cookie-monster';

const BATCH_UPDATE_FREQUENCY = 180000;

function isPrivateTab(tabId) {
  return new Promise((resolve) => {
    tabs.get(tabId, (tab) => {
      resolve(tab.incognito);
    });
  });
}

function formatDate(date) {
  return date.toISOString().substring(0, 10);
}

export default background({

  requiresServices: ['telemetry'],
  antitracking: inject.module('antitracking'),

  init() {
    this.cookieMonster = new CookieMonster(this.isTrackerDomain.bind(this), {
      expireSession: prefs.get('cookie-monster.expireSession', false),
      nonTracker: prefs.get('cookie-monster.nonTracker', false),
    }, this.telemetry.bind(this));

    this.subjectCookies = new Subject();
    this.onCookieChanged = (changeInfo) => {
      this.subjectCookies.next(changeInfo);
    };
    this.subjectPages = new Subject();
    this.onPage = this.onPage.bind(this);
    cookies.onChanged.addListener(this.onCookieChanged);

    // listen for page loads on tracker domains
    WebRequest.onHeadersReceived.addListener(this.onPage, {
      urls: ['<all_urls>'],
      types: ['main_frame'],
    });

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
    });

    // trigger pruning after first batch on startup, or when the date changes
    this.pruneStream = batchObservable.pipe(
      map(() => formatDate(new Date())),
      distinctUntilChanged()
    )
      .subscribe(() => {
        this.cookieMonster.pruneDb();
      });

    return Promise.all([initDb, initTrackerList]);
  },

  unload() {
    cookies.onChanged.removeListener(this.onCookieChanged);
    clearTimeout(this.initialRun);
    this.trackerCookiesStream.unsubscribe();
    this.pruneStream.unsubscribe();
    this.pageStream.unsubscribe();
    WebRequest.onHeadersReceived.removeListener(this.onPage);
    this.cookieMonster.unload();
  },

  telemetry(signal, value) {
    logger.debug('telemetry', signal, value);
    return inject.service('telemetry', ['push']).push(value, `${TELEMETRY_PREFIX}.${signal}`).catch((e) => {
      console.error('anolysis error', e);
    });
  },

  async onPage(details) {
    if (details.type !== 'main_frame') {
      return;
    }
    if (details.isPrivate) {
      return;
    }

    const domain = getGeneralDomain(details.url);
    if (domain && this.trackers
        && this.trackers.isTrackerDomain(md5(domain).substring(0, 16))) {
      // do not register private tabs
      // on webextensions check tab API, on firefox use details.isPrivate
      const checkIsPrivate = typeof details.isPrivate !== 'boolean'
        ? isPrivateTab(details.tabId)
        : Promise.resolve(details.isPrivate);
      if (await checkIsPrivate) {
        return;
      }
      this.subjectPages.next({
        tabId: details.tabId,
        domain,
        statusCode: details.statusCode,
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
    return this.trackers.isTrackerDomain(md5(domain).substring(0, 16));
  },

  events: {},

  actions: {
  },
});
