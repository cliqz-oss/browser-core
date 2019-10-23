/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';
import { getGeneralDomain } from '../core/tlds';
import {
  TrackerCookiePolicy,
  SessionCookiePolicy,
  NonTrackerCookiePolicy,
  SpecialCookiePolicy,
  ONE_HOUR,
  ONE_WEEK,
  THIRTY_DAYS,
} from './policy';
import logger from './logger';
import cookies from '../platform/cookies';
import { browser } from '../platform/globals';

const cookieKeyCols = ['domain', 'path', 'name', 'storeId', 'firstPartyDomain'];
export function cookieId(cookie) {
  return cookieKeyCols.map(col => cookie[col]).join(':');
}

export function cookieGeneralDomain(cookieDomain) {
  const domain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
  return getGeneralDomain(domain) || domain;
}

export function formatDate(date) {
  return date.toISOString().substring(0, 10);
}

export default class CookieMonster {
  constructor(isTrackerDomain, config, telemetry) {
    this.isTrackerDomain = isTrackerDomain;
    this.telemetry = telemetry;
    this.policies = [new TrackerCookiePolicy()];
    if (config.expireSession) {
      this.policies.push(new SessionCookiePolicy());
    }
    if (config.nonTracker) {
      this.policies.push(new SpecialCookiePolicy());
      this.policies.push(new NonTrackerCookiePolicy());
    }
    this.trackerLSOPruningEnabled = config.trackerLocalStorage && !!browser.browsingData;
  }

  async init() {
    const Dexie = await getDexie();
    this.db = new Dexie('cookie-monster');
    const localStorage = 'hostname, expires';
    const trackerCookies = '[domain+path+name+storeId+firstPartyDomain], created, session';
    const visits = '[domain+day], domain, day';
    this.db.version(4).stores({
      localStorage,
      trackerCookies,
      visits,
    });
    this.db.version(3).stores({
      localStorage,
    });
    this.db.version(2).stores({
      trackerCookies,
    });
    this.db.version(1).stores({
      trackerCookies: '[domain+path+name+storeId+firstPartyDomain], created',
      visits,
    });
    return this.db.open();
  }

  unload() {
    if (this.db) {
      this.db.close();
    }
  }

  addVisit(domain, date) {
    return this.db.visits.put({
      domain,
      day: formatDate(date || new Date()),
    });
  }

  shouldObserve(cookie) {
    const isTracker = this.isTrackerDomain(cookieGeneralDomain(cookie.domain));
    return this.policies.some(p => p.appliesTo(cookie, isTracker));
  }

  processBatch(ckis) {
    return Promise.all([this.upsertCookies(ckis), this.getTrackerCookieVisits(ckis)])
      .then(async ([results, visited]) => {
        logger.debug('cookies', results, visited);

        // timestamps are in seconds for compatibility with cookie expirations
        const nows = Date.now() / 1000;
        const actions = results.map((cookie) => {
          if (cookie.removed) {
            this.deleteCookie(cookie);
            return 'expired';
          }
          const isTracker = this.isTrackerDomain(cookieGeneralDomain(cookie.domain));
          // non trackers: 30 day expiry.
          // trackers: 1 hour
          const policy = this.policies.find(p => p.appliesTo(cookie, isTracker));
          if (!policy) {
            logger.debug('no policy found for cookie', cookie);
            return 'no policy';
          }
          const { visits } = visited[cookieGeneralDomain(cookie.domain)] || { visits: 0 };
          const shouldExpireAt = policy.getExpiry(cookie, visits);
          const modExpiry = shouldExpireAt / 1000;

          if (modExpiry < nows) {
            // this cookie should be expired, delete it from the db
            logger.debug('delete cookie', cookieId(cookie));
            this.deleteCookie(cookie);
            const protocol = cookie.secure ? 'https' : 'http';
            const cookieDelete = {
              name: cookie.name,
              url: `${protocol}://${cookie.domain}${cookie.path}`,
              storeId: cookie.storeId,
            };
            if (cookie.domain.startsWith('.')) {
              cookieDelete.url = `${protocol}://${cookie.domain.substring(1)}${cookie.path}`;
            }
            if (cookieDelete.firstPartyDomain) {
              cookieDelete.firstPartyDomain = cookie.firstPartyDomain;
            }
            cookies.remove(cookieDelete);
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
            logger.debug('update cookie expiry', cookieId(cookie), new Date(cookie.expirationDate * 1000), '->', new Date(modExpiry * 1000), policy.constructor.name);
            cookies.set(cookieUpdate);
            return 'update';
          }
          return '';
        });

        // localstorage expiry
        let localStorageDeleted = 0;
        if (this.trackerLSOPruningEnabled) {
          localStorageDeleted = (await this.pruneLocalStorage()).length;
        }

        if (this.telemetry) {
          this.telemetry('cookieBatch', {
            count: ckis.length,
            existing: results.length,
            visited: Object.keys(visited).length,
            deleted: actions.filter(a => a === 'delete').length,
            modified: actions.filter(a => a === 'update').length,
            expired: actions.filter(a => a === 'expired').length,
            localStorageDeleted,
          });
        }
        return actions;
      });
  }

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
        // created time should persist if the value is still the same. The rest can be updated
        cookieMap[key].created = cookieMap[key].value !== cookie.value ? created : cookie.created;
      }).then(() =>
        // update db, then return the results
        this.db.trackerCookies.bulkPut(Object.values(cookieMap))
          .then(() => Object.values(cookieMap)));
  }

  getTrackerCookieVisits(ckis) {
    const domains = new Set(ckis.map(({ cookie }) => cookieGeneralDomain(cookie.domain)));
    return this.db.visits.where('domain').anyOf(...domains)
      .toArray().then(result =>
        // count visits per domain
        result.reduce((visited, row) => ({
          ...visited,
          [row.domain]: {
            visits: (visited[row.domain] ? visited[row.domain].visits : 0) + 1,
          },
        }), {}));
  }

  deleteCookie(cookie) {
    return this.db.trackerCookies.where(cookieKeyCols.reduce((hash, col) =>
      Object.assign(hash, {
        [col]: cookie[col]
      }), Object.create(null)))
      .delete();
  }

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
    await this.processBatch(
      (await sessionCookies.toArray()).map(cookie => ({ cookie, removed: false }))
    );
    // check total number of cookies
    const allCookies = await cookies.getAll({});
    const cookieOrigins = allCookies.reduce((origins, cki) => {
      origins.add(cookieGeneralDomain(cki.domain));
      return origins;
    }, new Set());

    return this.telemetry('prune', {
      visitsPruned: await pruneVisits,
      cookiesPruned: await pruneCookies,
      sessionsPruned: await sessionCookies.delete(),
      visitsCount: await this.db.visits.count(),
      cookiesCount: await this.db.trackerCookies.count(),
      totalCookies: allCookies.length,
      totalOrigins: cookieOrigins.size,
    });
  }

  async onFrame({ domain, hostname, firstParty }) {
    // check if this domain was visited
    const visits = await this.db.visits.where('domain').equals(domain).toArray();
    let expireIn = ONE_HOUR * 24;
    if (firstParty) {
      // load in first party context
      expireIn = THIRTY_DAYS;
    } else if (visits.length > 0) {
      expireIn = ONE_WEEK;
    }
    const expires = Date.now() + expireIn;
    const entry = (await this.db.localStorage.get(hostname)) || { hostname, expires };
    entry.expires = Math.max(entry.expires, expires);
    await this.db.localStorage.put(entry);
  }

  async pruneLocalStorage() {
    const expiryDue = await this.db.localStorage.where('expires').below(Date.now()).toArray();
    const hostnames = expiryDue.map(({ hostname }) => hostname);
    logger.debug('deleting localstorage for hosts:', hostnames);
    await browser.browsingData.removeLocalStorage({
      hostnames,
    });
    await this.db.localStorage.bulkDelete(hostnames);
    return hostnames;
  }
}
