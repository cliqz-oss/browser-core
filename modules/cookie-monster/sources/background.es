import inject from '../core/kord/inject';
import background from '../core/base/background';
import cookies from '../platform/cookies';
import { getGeneralDomain } from '../core/tlds';
import md5 from '../core/helpers/md5';
import console from '../core/console';
import getDexie from '../platform/lib/dexie';
import Rx from '../platform/lib/rxjs';
import WebRequest from '../core/webrequest';
import { URLInfo } from '../core/url-info';
import tabs from '../platform/tabs';
import moment from '../platform/lib/moment';
import telemetry from '../core/services/telemetry';

const LOGKEY = 'CookieMonster';
const TELEMETRY_PREFIX = 'cookie-monster';

const BATCH_UPDATE_FREQUENCY = 180000;
const BASE_EXPIRY = 1000 * 60 * 60; // one hour
const VISITED_EXPIRY = 1000 * 60 * 60 * 24 * 7; // one week
const REGULAR_VISITED_EXPIRY = 1000 * 60 * 60 * 24 * 30; // 30 days

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

export default background({

  requiresServices: ['telemetry'],
  antitracking: inject.module('antitracking'),
  DEBUG: false,

  init() {
    this.subjectCookies = new Rx.Subject();
    this.onCookieChanged = (changeInfo) => {
      this.subjectCookies.next(changeInfo);
    };
    this.subjectPages = new Rx.Subject();
    this.onPage = this.onPage.bind(this);
    cookies.onChanged.addListener(this.onCookieChanged);

    // listen for page loads on tracker domains
    WebRequest.onHeadersReceived.addListener(this.onPage, {
      urls: ['<all_urls>'],
      types: ['main_frame'],
    });

    // filter page loads: must stay on site for 10s before it is logged
    this.pageStream = this.subjectPages.observeOn(Rx.Scheduler.async)
      .groupBy(({ tabId }) => tabId)
      .flatMap(group => group
        .distinctUntilChanged((a, b) => a.domain === b.domain)
        .debounceTime(10000))
      .subscribe((visit) => {
        if (this.DEBUG) {
          console.log(LOGKEY, 'visit to tracker domain', visit);
        }
        this.db.visits.put({
          domain: visit.domain,
          day: moment().format('YYYY-DD-MM'),
        });
      });

    // filter modified cookies for ones from trackers
    // batches and groups them to remove duplicates
    const batchObservable = this.subjectCookies.observeOn(Rx.Scheduler.async)
      .filter(({ cookie }) =>
        !cookie.session &&
          ['firefox-private', '1'].indexOf(cookie.storeId) === -1 && // skip private tab cookies
          this.trackers &&
          this.trackers.isTrackerDomain(md5(cookieGeneralDomain(cookie.domain)).substring(0, 16)) &&
          cookie.expirationDate > (Date.now() + (1000 * 60 * 60)) / 1000
      )
      .groupBy(({ cookie }) => cookieId(cookie))
      .flatMap(group => group.auditTime(10000))
      .bufferTime(BATCH_UPDATE_FREQUENCY)
      .filter(group => group.length > 0);

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
    });
    const initTrackerList = this.antitracking.action('getWhitelist').then((qsWhitelist) => {
      this.trackers = qsWhitelist;
    });

    // trigger pruning after first batch on startup, or when the date changes
    this.pruneStream = batchObservable
      .map(() => (new Date()).toISOString().substring(0, 10))
      .distinctUntilChanged()
      .subscribe(() => {
        this.pruneDb();
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
  },

  telemetry(signal, value) {
    if (this.DEBUG) {
      console.log(LOGKEY, 'telemetry', signal, value);
    }
    return telemetry.push(value, `${TELEMETRY_PREFIX}.${signal}`).catch((e) => {
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

    const url = URLInfo.get(details.url);
    if (this.trackers && this.trackers.isTrackerDomain(md5(url.host.domain).substring(0, 16))) {
      // do not register private tabs
      // on webextensions check tab API, on firefox use details.isPrivate
      const checkIsPrivate = typeof details.isPrivate !== 'boolean' ?
        isPrivateTab(details.tabId) :
        Promise.resolve(details.isPrivate);
      if (await checkIsPrivate) {
        return;
      }
      this.subjectPages.next({
        tabId: details.tabId,
        domain: url.host.domain,
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
        }), {})
      );
  },

  onCookieBatch(ckis) {
    return Promise.all([this.upsertCookies(ckis), this.getTrackerCookieVisits(ckis)])
      .then(([results, visited]) => {
        if (this.DEBUG) {
          console.log(LOGKEY, 'cookies', results, visited);
        }

        // timestamps are in seconds for compatibility with cookie expirations
        const nows = Date.now() / 1000;
        const actions = results.filter(cookie => !cookie.removed).map((cookie) => {
          let duration = BASE_EXPIRY;
          if (visited[cookieGeneralDomain(cookie.domain)]) {
            const visits = visited[cookieGeneralDomain(cookie.domain)].visits;
            duration = visits > 6 ? REGULAR_VISITED_EXPIRY : VISITED_EXPIRY;
          }
          const modExpiry = (cookie.created + duration) / 1000;

          if (modExpiry < nows) {
            // this cookie should be expired, delete it
            if (this.DEBUG) {
              console.log(LOGKEY, 'delete cookie', cookieId(cookie));
            }
            const cookieDesc = {
              url: `https://${cookie.domain}${cookie.path}`,
              name: cookie.name,
              storeId: cookie.storeId,
            };
            if (cookie.firstPartyDomain) {
              cookieDesc.firstPartyDomain = cookie.firstPartyDomain;
            }
            cookies.remove(cookieDesc);
            this.db.trackerCookies.where(cookieKeyCols.reduce((hash, col) =>
              Object.assign(hash, {
                [col]: cookie[col]
              }), Object.create(null))
            ).delete();
            return 'delete';
          } else if (modExpiry < cookie.expirationDate) {
            const cookieUpdate = {
              url: `https://${cookie.domain}${cookie.path}`,
              httpOnly: cookie.httpOnly,
              name: cookie.name,
              value: cookie.value,
              path: cookie.path,
              secure: cookie.secure,
              expirationDate: parseInt(modExpiry, 10),
              storeId: cookie.storeId,
            };
            // non host-only domains need a domain property
            if (cookie.domain.startsWith('.')) {
              cookieUpdate.domain = cookie.domain;
            }
            // firstPartyDomain only if provided, not supported on chrome
            if (cookieUpdate.firstPartyDomain) {
              cookieUpdate.firstPartyDomain = cookie.firstPartyDomain;
            }
            if (this.DEBUG) {
              console.log(LOGKEY, 'update cookie expiry', cookieId(cookie), new Date(modExpiry * 1000));
            }
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
        firstPartyDomain } = cookie;
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
          .then(() => Object.values(cookieMap))
      );
  },

  async pruneDb() {
    if (this.DEBUG) {
      console.log(LOGKEY, 'prunedb');
    }
    const dayCutoff = new Date();
    dayCutoff.setDate(dayCutoff.getDate() - 30);
    const pruneVisits = this.db.visits.where('day')
      .below(dayCutoff.toISOString().substring(0, 10))
      .delete();
    const pruneCookies = this.db.trackerCookies.where('created')
      .below(dayCutoff.getTime())
      .delete();
    return this.telemetry('prune', {
      visitsPruned: await pruneVisits,
      cookiesPruned: await pruneCookies,
      visitsCount: await this.db.visits.count(),
      cookiesCount: await this.db.trackerCookies.count(),
    });
  },

  events: {},

  actions: {
  },
});
