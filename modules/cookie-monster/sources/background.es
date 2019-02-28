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
import getDexie from '../platform/lib/dexie';
import WebRequest from '../core/webrequest';
import tabs from '../platform/tabs';
import Logger from '../core/logger';
import prefs from '../core/prefs';
import { chrome } from '../platform/globals';

const logger = Logger.get('cookie-monster', { level: 'debug' });
const TELEMETRY_PREFIX = 'cookie-monster';

const BATCH_UPDATE_FREQUENCY = 180000;
const BASE_EXPIRY = 1000 * 60 * 60; // one hour
const VISITED_EXPIRY = 1000 * 60 * 60 * 24 * 7; // one week
const REGULAR_VISITED_EXPIRY = 1000 * 60 * 60 * 24 * 30; // 30 days

const cookieSpecialTreatment = {
  _ga: VISITED_EXPIRY,
  _gid: BASE_EXPIRY,
  _fbp: 1,
};

const cookieKeyCols = ['domain', 'path', 'name', 'storeId', 'firstPartyDomain'];
function cookieId(cookie) {
  return cookieKeyCols.map(col => cookie[col]).join(':');
}

function cookieGeneralDomain(cookieDomain) {
  const domain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
  return getGeneralDomain(domain);
}

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
    this.sessionCookieExpiry = prefs.get('cookie-monster.expireSession', false);
    this.nonTrackerCookieExpiry = prefs.get('cookie-monster.nonTracker', false);

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
      groupBy(({ tabId }) => tabId, undefined, () => timer(300000)),
      flatMap(group => group.pipe(
        distinctUntilChanged((a, b) => a.domain === b.domain),
        debounceTime(10000)
      ))
    )
      .subscribe((visit) => {
        logger.debug('visit to tracker domain', visit);
        this.db.visits.put({
          domain: visit.domain,
          day: formatDate(new Date()),
        });
      });

    // filter modified cookies for ones from trackers
    // batches and groups them to remove duplicates

    const batchObservable = this.subjectCookies.pipe(
      observeOn(asyncScheduler),
      filter(({ cookie }) =>
        ['firefox-private', '1'].indexOf(cookie.storeId) === -1 // skip private tab cookies
        && (this.nonTrackerCookieExpiry || this.isTrackerDomain(cookie.domain))
        && (!cookie.session || this.sessionCookieExpiry)),
      groupBy(({ cookie }) => cookieId(cookie), undefined, () => timer(30000)),
      flatMap(group => group.pipe(auditTime(10000))),
      bufferTime(BATCH_UPDATE_FREQUENCY),
      filter(group => group.length > 0)
    );

    this.trackerCookiesStream = batchObservable
      .subscribe((ckis) => {
        this.onCookieBatch(ckis);
      });

    const initDb = getDexie().then((Dexie) => {
      this.db = new Dexie('cookie-monster');
      this.db.version(1).stores({
        trackerCookies: '[domain+path+name+storeId+firstPartyDomain], created',
        visits: '[domain+day], domain, day',
      });
      this.db.version(2).stores({
        trackerCookies: '[domain+path+name+storeId+firstPartyDomain], created, session',
      });
    });
    const initTrackerList = this.antitracking.action('getWhitelist').then((qsWhitelist) => {
      this.trackers = qsWhitelist;
    });

    // trigger pruning after first batch on startup, or when the date changes
    this.pruneStream = batchObservable.pipe(
      map(() => formatDate(new Date())),
      distinctUntilChanged()
    )
      .subscribe(() => {
        this.pruneDb();
      });

    if (chrome.cliqzdbmigration && !prefs.has('cookie-monster.migrated')) {
      chrome.cliqzdbmigration.exportDexieTable('cookie-monster', 2, 'visits').then(async (rows) => {
        await this.db.visits.bulkPut(rows);
        await chrome.cliqzdbmigration.deleteDatabase('cookie-monster');
        prefs.set('cookie-monster.migrated', true);
      }, logger.debug);
    }

    return Promise.all([initDb, initTrackerList]);
  },

  unload() {
    cookies.onChanged.removeListener(this.onCookieChanged);
    clearTimeout(this.initialRun);
    this.trackerCookiesStream.unsubscribe();
    this.pruneStream.unsubscribe();
    this.pageStream.unsubscribe();
    WebRequest.onHeadersReceived.removeListener(this.onPage);
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

  getTrackerCookieVisits(ckis) {
    return this.db.visits.where('domain').anyOf(ckis.map(({ cookie }) => cookieGeneralDomain(cookie.domain)))
      .toArray().then(result =>
        // count visits per domain
        result.reduce((visited, row) => ({
          ...visited,
          [row.domain]: {
            visits: (visited[row.domain] ? visited[row.domain].visits : 0) + 1,
          },
        }), {}));
  },

  onCookieBatch(ckis) {
    return Promise.all([this.upsertCookies(ckis), this.getTrackerCookieVisits(ckis)])
      .then(([results, visited]) => {
        logger.debug('cookies', results, visited);

        // timestamps are in seconds for compatibility with cookie expirations
        const nows = Date.now() / 1000;
        const actions = results.filter(cookie => !cookie.removed).map((cookie) => {
          const isTracker = this.isTrackerDomain(cookie.domain);
          // non trackers: 30 day expiry.
          // trackers: 1 hour
          let duration = isTracker ? BASE_EXPIRY : REGULAR_VISITED_EXPIRY;
          if (cookie.session) {
            // 1 day
            duration = BASE_EXPIRY * 24;
          }
          // expiry default: `duration` since first created
          let shouldExpireAt = cookie.created + duration;

          if (visited[cookieGeneralDomain(cookie.domain)]) {
            const visits = visited[cookieGeneralDomain(cookie.domain)].visits;
            // if visited: expiry is N-days from now
            duration = visits > 6 ? REGULAR_VISITED_EXPIRY : VISITED_EXPIRY;
            shouldExpireAt = Date.now() + duration;
          } else if (cookieSpecialTreatment[cookie.name]) {
            // special treatment: adjust expiry to specified duration
            shouldExpireAt = cookie.created + cookieSpecialTreatment[cookie.name];
          }
          const modExpiry = shouldExpireAt / 1000;

          if (modExpiry < nows) {
            // this cookie should be expired, delete it from the db
            logger.debug('delete cookie', cookieId(cookie));
            this.db.trackerCookies.where(cookieKeyCols.reduce((hash, col) =>
              Object.assign(hash, {
                [col]: cookie[col]
              }), Object.create(null)))
              .delete();
            return 'delete';
          }
          if (cookie.expirationDate && modExpiry < cookie.expirationDate) {
            const protocol = cookie.secure ? 'https' : 'http';
            const cookieUpdate = {
              url: `${protocol}://${cookie.domain}${cookie.path}`,
              httpOnly: cookie.httpOnly,
              name: cookie.name,
              value: cookie.value,
              path: cookie.path,
              secure: cookie.secure,
              expirationDate: parseInt(modExpiry, 10),
              storeId: cookie.storeId,
              sameSite: cookie.sameSite,
            };
            // non host-only domains need a domain property
            if (cookie.domain.startsWith('.')) {
              cookieUpdate.domain = cookie.domain;
              cookieUpdate.url = `${protocol}://${cookie.domain.substring(1)}${cookie.path}`;
            }
            // firstPartyDomain only if provided, not supported on chrome
            if (cookieUpdate.firstPartyDomain) {
              cookieUpdate.firstPartyDomain = cookie.firstPartyDomain;
            }
            logger.debug('update cookie expiry', cookieId(cookie), new Date(cookie.expirationDate * 1000), '->', new Date(modExpiry * 1000));
            cookies.set(cookieUpdate);
            return 'update';
          }
          return '';
        });
        this.telemetry('cookieBatch', {
          count: ckis.length,
          existing: results.length,
          visited: Object.keys(visited).length,
          deleted: actions.filter(a => a === 'delete').length,
          modified: actions.filter(a => a === 'update').length,
        });
      });
  },

  upsertCookies(ckis) {
    const created = Date.now();
    // convert cookies to a map against the database keys
    const cookieMap = ckis.reduce((hash, { cookie, removed }) => {
      const { domain, expirationDate, httpOnly, name, secure, value, path, storeId,
        firstPartyDomain, sameSite, session } = cookie;
      return Object.assign(hash, {
        [cookieId(cookie)]: {
          domain,
          path,
          name,
          expirationDate,
          httpOnly,
          secure,
          value: !removed ? value : undefined,
          created,
          removed,
          storeId,
          firstPartyDomain: firstPartyDomain || '',
          sameSite,
          session: session ? 1 : 0,
        }
      });
    }, Object.create(null));
    // find any existing entries in the database
    return this.db.trackerCookies.where(cookieKeyCols)
      .anyOf(ckis.map(({ cookie }) => cookieKeyCols.map(col => cookie[col] || '')))
      .each((cookie) => {
        const key = cookieId(cookie);
        // created time should persist, the rest can be updated
        cookieMap[key].created = cookie.created;
      }).then(() =>
        // update db, then return the results
        this.db.trackerCookies.bulkPut(Object.values(cookieMap))
          .then(() => Object.values(cookieMap)));
  },

  async pruneDb() {
    const dayCutoff = new Date();
    dayCutoff.setDate(dayCutoff.getDate() - 30);
    const pruneVisits = this.db.visits.where('day')
      .below(formatDate(dayCutoff))
      .delete();
    const pruneCookies = this.db.trackerCookies.where('created')
      .below(dayCutoff.getTime())
      .delete();
    // prune session cookies
    dayCutoff.setDate(dayCutoff.getDate() + 29);
    const sessionCookies = this.db.trackerCookies.where('session').equals(1)
      .filter(c => c.created < dayCutoff);
    // run a batch for session cookies to make sure they are deleted
    await this.onCookieBatch(
      (await sessionCookies.toArray()).map(cookie => ({ cookie, removed: false }))
    );
    return this.telemetry('prune', {
      visitsPruned: await pruneVisits,
      cookiesPruned: await pruneCookies,
      sessionsPruned: await sessionCookies.delete(),
      visitsCount: await this.db.visits.count(),
      cookiesCount: await this.db.trackerCookies.count(),
    });
  },

  isTrackerDomain(domain) {
    if (!this.trackers) {
      return false;
    }
    return this.trackers.isTrackerDomain(md5(cookieGeneralDomain(domain)).substring(0, 16));
  },

  events: {},

  actions: {
  },
});
