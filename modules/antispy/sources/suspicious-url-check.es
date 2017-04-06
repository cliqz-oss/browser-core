import console from '../core/console';
import prefs from '../core/prefs';
import utils from '../core/utils';
import ResourceLoader from '../core/resource-loader';
import { auditInstalledAddons } from '../platform/antitracking/addon-check';

const REPORTED_PREF = 'spywareLastSuspiciousReported';

function getDayString() {
  return (new Date()).toISOString().substring(0, 10);
}

/**
 * This class checks for third party requests to designated suspicious third-party
 * domains, and then can either send telemetry about them, or block the requests.
 * @class  SuspiciousUrlCheck
 * @namespace antispy
 */
export default class {

  /**
   * Create a SuspiciousUrlCheck instance with the provided telemetry provider
   * @param  {function} telemetry function through which telemetry will be sent
   * @constructor
   */
  constructor(telemetry) {
    this.telemetry = telemetry;
    // trie of reversed domain to lookup flagged subdomains
    this.suspiciousPatterns = {};
    this.actions = new Set(['report', 'block']);
    this.matched = {};
    this.reported = prefs.get(REPORTED_PREF, null);
  }

  /**
   * Initialise the step:
   *  - Registers a interval task every 10 minutes to flush any data to send
   *  - Creates a ResourceLoader to load the latest version of the patterns list
   */
  init() {
    this._pmsend = utils.setInterval(this.sendSuspiciousReports.bind(this), 10 * 60 * 1000);
    this._loader = new ResourceLoader(['antispy', 'suspicious_patterns.json'], {
      remoteURL: 'https://cdn.cliqz.com/anti-tracking/suspicious_patterns.json',
      cron: 24 * 60 * 60 * 1000,
    });
    const loadPatterns = (patterns) => { this.suspiciousPatterns = patterns; };
    this._loader.onUpdate(loadPatterns);
    return this._loader.load().then(loadPatterns);
  }

  /**
   * Unload interval task and stops the resource loader
   */
  unload() {
    if (this._loader) {
      this._loader.stop();
    }
    utils.clearInterval(this._pmsend);
  }

  /**
   * Anti-tracking pipeline step to check for a match from our suspicious patterns file.
   *
   * We assume that some previous steps have already been taken:
   *  - state.urlParts is set (by antitracking.steps.context.determineContext)
   *  - this is a third party call (i.e. antitracking.steps.pageLogger.checkIsMainDocument and
   *  checkSameGeneralDomain are earlier in the pipeline)
   *  - state.incrementState is a function (by antitracking.steps.pageLogger.attachStatCounter)
   *
   * @param  {Object} state    request metadata
   * @param  {Object} response WebRequest response object
   * @return {Boolean}          false if the request host is in the suspicious patterns list and
   * the action is 'block', true otherwise.
   */
  checkIsSuspicious(state, r) {
    const response = r;
    const hostParts = state.urlParts.hostname.split('.').reverse();
    const trail = [];
    let node = this.suspiciousPatterns;

    for (let i = 0; i < hostParts.length; i += 1) {
      const part = hostParts[i];
      if (node[part] === undefined) {
        break;
      }
      // move to next node in tree
      node = node[part];
      trail.push(part);

      // check if we've hit a valid leaf node
      if (this.actions.has(node)) {
        switch (node) {
          case 'report':
            this.reportSuspicious(state, trail);
            break;
          case 'block':
            console.log('ATTRACK', 'block suspicious', trail);
            response.cancel = true;
            state.incrementStat('suspicious_blocked');
            return false;
          default: // unreachable
            break;
        }
        break;
      }
    }
    return true;
  }

  /**
   * Report a request matching a suspicious pattern.
   *
   * Updates the local cache so that telemetry will be sent the next time the pacemaker
   * task is triggered
   * @param  {Object} state Request state metadata
   * @param  {Array} match  The matching hostname parts
   */
  reportSuspicious(state, match) {
    const pattern = match.reverse().join('.');
    console.log('ATTRACK', 'report suspicious third party', pattern, state.url);
    if (!this.matched[pattern]) {
      this.matched[pattern] = new Set();
    }
    this.matched[pattern].add(state.urlParts.hostname);
  }

  /**
   * Sends a report message via humanweb if a suspicious request was seen today.
   *
   * Telemetry is rate limited to one message per day. We send a list of installed
   * addons with the telemetry message, so that we can try to find the source of the
   * suspicious request.
   */
  sendSuspiciousReports() {
    const day = getDayString();

    // no matched means no data to send
    if (Object.keys(this.matched).length === 0) {
      return;
    }

    // reported already today
    if (this.reported === day) {
      return;
    }

    const payload = {
      matched: {},
      extensions: [],
    };

    // copy matched patterns to payload
    Object.keys(this.matched).forEach((pattern) => {
      payload.matched[pattern] = [...this.matched[pattern]];
    });
    this.matched = {};

    auditInstalledAddons().then((addons) => {
      payload.extensions = addons;
      console.log('ATTRACK', 'telemetry: suspicious', payload);
      this.telemetry({
        message: {
          action: 'attrack.suspicious',
          payload,
        },
      });
      prefs.set(REPORTED_PREF, day);
      this.reported = day;
    });
  }
}
