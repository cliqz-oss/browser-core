import getDexie from '../platform/lib/dexie';
import { getGeneralDomain } from '../core/tlds';
import {
  TrackerCookiePolicy,
  SessionCookiePolicy,
  NonTrackerCookiePolicy,
  SpecialCookiePolicy,
} from './policy';
import logger from './logger';
import cookies from '../platform/cookies';

const cookieKeyCols = ['domain', 'path', 'name', 'storeId', 'firstPartyDomain'];
export function cookieId(cookie) {
  return cookieKeyCols.map(col => cookie[col]).join(':');
}

export function cookieGeneralDomain(cookieDomain) {
  const domain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
  return getGeneralDomain(domain);
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
  }

  async init() {
    const Dexie = await getDexie();
    this.db = new Dexie('cookie-monster');
    this.db.version(1).stores({
      trackerCookies: '[domain+path+name+storeId+firstPartyDomain], created',
      visits: '[domain+day], domain, day',
    });
    this.db.version(2).stores({
      trackerCookies: '[domain+path+name+storeId+firstPartyDomain], created, session',
    });
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
      .then(([results, visited]) => {
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
        if (this.telemetry) {
          this.telemetry('cookieBatch', {
            count: ckis.length,
            existing: results.length,
            visited: Object.keys(visited).length,
            deleted: actions.filter(a => a === 'delete').length,
            modified: actions.filter(a => a === 'update').length,
            expired: actions.filter(a => a === 'expired').length,
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
    return this.db.visits.where('domain').anyOf(ckis.map(({ cookie }) => cookieGeneralDomain(cookie.domain)))
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
    return this.telemetry('prune', {
      visitsPruned: await pruneVisits,
      cookiesPruned: await pruneCookies,
      sessionsPruned: await sessionCookies.delete(),
      visitsCount: await this.db.visits.count(),
      cookiesCount: await this.db.trackerCookies.count(),
    });
  }
}
