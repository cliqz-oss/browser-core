import inject from '../core/kord/inject';
import background from '../core/base/background';
import cookies from '../platform/cookies';
import { getGeneralDomain } from '../core/tlds';
import md5 from '../core/helpers/md5';
import History from '../platform/history/history';
import console from '../core/console';
import utils from '../core/utils';
import { Cron } from '../core/anacron';

const PRUNE_CUTOFF = 1000 * 60 * 60 * 24 * 30;

/**
 * Checks if the user has history on the given domain since the timestamp fromTime.
 * @param domain
 * @param fromTime
 * @returns Promise resolves to true if there are no history entries, false otherwise
 */
function getDomainHasNoHistory(domain, fromTime) {
  const qDomain = domain.startsWith('.') ? `*${domain}` : domain;
  return History.query({ domain: qDomain, frameStartsAt: fromTime, limit: 1 })
        .then(res => res.places.length === 0);
}

export default background({

  antitracking: inject.module('antitracking'),
  hpn: inject.module('hpn'),

  init() {
    this.initialRun = utils.setTimeout(this.actions.pruneCookies.bind(this), 20000);
    this.cron = new Cron();
    this.cron.schedule(this.actions.pruneCookies, '0 0 * * *');
    this.cron.start();
  },

  unload() {
    this.cron.stop();
    utils.clearTimeout(this.initialRun);
  },

  /**
   * Get the list of cookies set for this user which originate from a known tracking domain
   */
  getTrackerCookies() {
    return Promise.all([
      this.antitracking.action('getWhitelist'),
      cookies.getAll({})
    ]).then(([qsWhitelist, userCookies]) =>
      userCookies.filter((cki) => {
        const domain = cki.domain.startsWith('.') ? cki.domain.slice(1) : cki.domain;
        const gd = getGeneralDomain(domain);
        return gd && qsWhitelist.isTrackerDomain(md5(gd).substring(0, 16));
      })
    );
  },

  sendPruneTelemetry(cookiesPruned) {
    return this.hpn.action('sendTelemetry', {
      action: 'attrack.cookiesPruned',
      payload: {
        removed: cookiesPruned,
      },
      ts: utils.getPref('config_ts'),
    }).catch((e) => {
      console.log('telemetry not available', e);
    });
  },

  events: {},

  actions: {
    pruneCookies() {
      return this.getTrackerCookies().then((trackerCookies) => {
        const cookieDomains = [...new Set(trackerCookies.map(cki => cki.domain))];
        // query all domains to see if we have visited them in the last 30 days
        const fromTime = Date.now() - PRUNE_CUTOFF;
        return Promise.all(cookieDomains.map(dom => getDomainHasNoHistory(dom, fromTime)))
        .then((domainsNoHistory) => {
          const pruneCookieDomains = new Set(cookieDomains.filter((dom, i) => domainsNoHistory[i]));
          return trackerCookies.filter(cki => pruneCookieDomains.has(cki.domain));
        });
      }).then((expiredCookies) => {
        console.log('pruning cookies:', expiredCookies.map(c => c.toString()));
        return Promise.all(expiredCookies.map(cki => cookies.remove({ cookie: cki })))
        .then(() => this.sendPruneTelemetry(expiredCookies.length));
      });
    },
  },
});
