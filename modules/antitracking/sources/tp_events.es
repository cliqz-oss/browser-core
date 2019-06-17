/* eslint no-restricted-syntax: 'off' */
/* eslint no-param-reassign: 'off' */

import console from '../core/console';
import { sameGeneralDomain, parse as parseHost } from '../core/tlds';
import md5 from '../core/helpers/md5';
import * as browser from '../platform/browser';
import { TELEMETRY } from './config';
import { truncateDomain } from './utils';

function truncatePath(path) {
  // extract the first part of the page path
  const [prefix] = path.substring(1).split('/');
  return `/${prefix}`;
}

const stats = ['c'];

function _newStatCounter() {
  const ctr = {};
  const statsKeys = stats;
  for (const s in statsKeys) {
    if (Object.prototype.hasOwnProperty.call(statsKeys, s)) {
      ctr[statsKeys[s]] = 0;
    }
  }
  return ctr;
}

// Class to hold a page load and third party urls loaded by this page.
class PageLoadData {
  constructor(url, isPrivate, reloaded, hasPlaceHolder, requestId) {
    this.initiatingRequest = requestId;
    this.url = url.href;
    this.hostname = url.hostname;
    this.path = this._shortHash(truncatePath(url.pathname));
    this.scheme = url.scheme;
    this.private = isPrivate;
    this.c = 1;
    this.s = Date.now();
    this.e = this.s;
    this.tps = {};
    this.redirects = [];
    this.redirectsPlaceHolder = [];
    this.placeHolder = hasPlaceHolder || false;
    this.ra = reloaded;
    this.annotations = {};
    this.tsv = '';
    this.tsvId = undefined;
    this.bugIdMapping = {};

    this.triggeringTree = {};
    this._plainObject = null;
    this._tpStatCounter = _newStatCounter;
  }

  // Create a short md5 hash of the input string s
  _shortHash(s) {
    if (!s) return '';
    return md5(s).substring(0, 16);
  }

  // Get a stat counter object for the given third party host and path in
  // this page load.
  getTpUrl(tpHost, tpPath) {
    // reset cached plain object
    this._plainObject = null;
    const pathKey = tpPath; // TODO hash it?
    if (!(tpHost in this.tps)) {
      this.tps[tpHost] = {};
    }
    if (!(pathKey in this.tps[tpHost])) {
      this.tps[tpHost][pathKey] = this._tpStatCounter();
    }
    return this.tps[tpHost][pathKey];
  }

  // Returns true if the given referrer matches this page load.
  // This can be either a direct referral (referrer matches page load url),
  // or nth degree (referrer is somewhere in the graph of referrals originating
  // from the original page load url).
  isReferredFrom(refParts) {
    if (!refParts) return false;
    if (sameGeneralDomain(refParts.hostname, this.hostname)) {
      return true;
    }
    // not a direct referral, but could be via a third party
    if (refParts.hostname in this.tps) {
      return true;
    }
    return false;
  }

  // Creates a plain, aggregated version of this object, suitable for converting
  // to JSON, and sending as telemetry.
  asPlainObject() {
    return this._plainObject || this._buildPlainObject();
  }

  // TODO - Sam
  addTrigger(host, triggeredBy, frameId) {
    if (triggeredBy.indexOf('://') > 0) {
      let triggerDomain = truncateDomain(parseHost(triggeredBy), 1);
      // if trigger is same as page, hide as 'first party'
      if (sameGeneralDomain(triggerDomain, this.hostname)) {
        triggerDomain = frameId === 0 ? 'first party' : 'first party frame';
      }
      // if triggered by self, don't add
      if (sameGeneralDomain(triggerDomain, host)) {
        return;
      }
      if (!this.triggeringTree[triggerDomain]) {
        this.triggeringTree[triggerDomain] = new Set();
      }
      this.triggeringTree[triggerDomain].add(truncateDomain(parseHost(host), 1));
    }
    this._plainObject = null;
  }

  addGhosteryBug(host, bid) {
    this.bugIdMapping[host] = bid;
  }

  setAsStaged() {
    this.e = Date.now();
    this._plainObject = null;
  }

  setTrackingStatus(status) {
    this.tsv = status.value;
    this.tsvId = status.statusId;
  }

  _buildPlainObject() {
    const self = this;
    const obj = {
      hostname: this._shortHash(this.hostname),
      path: this.path,
      scheme: this.scheme,
      c: this.c,
      t: this.e - this.s,
      ra: this.ra || 0,
      tps: {},
      placeHolder: this.placeHolder,
      redirects: this.redirects.filter(hostname => !sameGeneralDomain(hostname, self.hostname)),
      redirectsPlaceHolder: this.redirectsPlaceHolder.filter(
        (hasPlaceHolder, i) => !sameGeneralDomain(this.redirects[i], self.hostname)
      ),
      triggeringTree: {},
      tsv: this.tsv,
      tsv_id: this.tsvId !== undefined,
      frames: Object.keys(this.triggeringTree).reduce((frames, key) => {
        frames[key] = [...this.triggeringTree[key]];
        return frames;
      }, {}),
    };
    if (!obj.hostname) return obj;

    for (const tpDomain in this.tps) {
      if (Object.prototype.hasOwnProperty.call(this.tps, tpDomain)) {
        const tpDomainData = this.tps[tpDomain];
        const tpPaths = Object.keys(tpDomainData);
        // skip same general domain
        if (!sameGeneralDomain(self.hostname, tpDomain)) {
          if (tpPaths.length > 0) {
            // aggregate stats per tp domain.
            const pathData = tpPaths.map(k => tpDomainData[k]);
            obj.tps[tpDomain] = pathData.reduce(this._sumStats);

            // Remove the keys which have value == 0;
            stats.forEach((eachKey) => {
              if (obj.tps[tpDomain] && obj.tps[tpDomain][eachKey] === 0) {
                delete obj.tps[tpDomain][eachKey];
              }
            });
            // add ghostery bid mappings
            if (this.bugIdMapping[tpDomain]) {
              obj.tps[tpDomain].ghostery_bid = this.bugIdMapping[tpDomain];
            }
          }
        }
      }
    }

    // This was added to collect data for experiment, safe to stop collecting it now.
    // checkBlackList(this.url, obj);
    // checkFingerPrinting(this.url, obj);
    this._plainObject = obj;
    return obj;
  }

  _sumStats(a, b) {
    const c = {};
    const statsKeys = new Set(Object.keys(a).concat(Object.keys(b)));
    statsKeys.forEach((s) => {
      c[s] = (a[s] || 0) + (b[s] || 0);
    });
    return c;
  }
}

class PageEventTracker {
  constructor(telemetryCallback, config) {
    this.debug = false;
    this._active = {};
    this._old_tab_idx = {};
    this._staged = [];
    this._last_clean = 0;
    this._clean_interval = 1000 * 10;// 10s
    // 20 minutes decreasing the frequency from 5 minutes to 20 minutes.
    this._push_interval = 1000 * 60 * 20;
    this._last_push = 0;
    this.ignore = new Set(['self-repair.mozilla.org']);
    this.pushTelemetry = telemetryCallback;
    this.config = config;
    this.listeners = new Map();
  }

  // Called when a url is loaded on windowID source.
  // Returns the PageLoadData object for this url.
  //  or returns null if the url is malformed or null.
  onFullPage(url, tabId, isPrivate, requestId) {
    if (this._active[tabId] && this._active[tabId].initiatingRequest === requestId) {
      // request reissued for a redirect - do not create another page load
      return null;
    }
    // previous request finished. Move to staged
    const prevPage = this.stage(tabId);
    // create new page load entry for tab
    if (url && url.hostname
      && Number(tabId) >= 0 && tabId !== null
      && !this.ignore.has(url.hostname)) {
      // check if it is a reload of the same page
      const reloaded = (prevPage && url.toString() === prevPage.url
        && Date.now() - prevPage.s < 30000)
        || false;

      this._active[tabId] = new PageLoadData(
        url, isPrivate || false,
        reloaded || false,
        this.containsPlaceHolder(url),
        requestId,
      );
      return this._active[tabId];
    }
    return null;
  }

  onRedirect(url, tabId, isPrivate, requestId) {
    if (tabId in this._active) {
      const prev = this._active[tabId];

      this._active[tabId] = new PageLoadData(
        url, isPrivate || false,
        prev.ra || false,
        this.containsPlaceHolder(url),
        requestId,
      );
      this._active[tabId].redirects = prev.redirects;
      this._active[tabId].redirects.push(prev.hostname);
      this._active[tabId].redirectsPlaceHolder = prev.redirectsPlaceHolder;
      this._active[tabId].redirectsPlaceHolder.push(prev.placeHolder);
    } else {
      this.onFullPage(url, tabId, isPrivate, requestId);
    }
  }

  getPage(url, urlParts, ref, refParts, source) {
    if (source <= 0 || source === null || source === undefined) {
      if (this.debug) console.log('No source for request, not logging!', 'tp_events');
      return null;
    }

    if (!(source in this._active)) {
      if (!ref || !refParts || !refParts.hostname) {
        return null;
      }
      if (this.debug) console.log(`No fullpage request for referrer: ${ref} -> ${url}`, 'tp_events');
      return null;
    }

    const pageGraph = this._active[source];
    if (!pageGraph.isReferredFrom(refParts)) {
      if (!ref || !refParts || !refParts.hostname) return null;
      if (source in this._old_tab_idx) {
        const prevGraph = this._staged[this._old_tab_idx[source]];
        if (prevGraph && prevGraph.isReferredFrom(refParts)) {
          if (this.debug) console.log(`Request for expired tab ${refParts.hostname} -> ${urlParts.hostname} (${prevGraph.hostname})`, 'tp_events');
          return prevGraph;
        }
      }
      if (this.debug) console.log(`tab/referrer mismatch ${refParts.hostname} -> ${urlParts.hostname} (${pageGraph.hostname})`, 'tp_events');
      return null;
    }
    return pageGraph;
  }

  // Get a stats object for the request to url, referred from ref, on tab source.
  // url_parts and ref_parts contain the decomposed parts (from parseURL)
  // of url and ref respectively.
  // returns an object containing keys specified in tp_events._stats representing the running stats
  // for the requesting third party on the source page.
  // Returns null if the referrer is not valid.
  get(url, urlParts, ref, refParts, source) {
    const pageGraph = this.getPage(url, urlParts, ref, refParts, source);
    if (!pageGraph) {
      return null;
    }
    // truncate the third-party domain before adding
    const truncDomain = truncateDomain(urlParts.domainInfo, this.config.tpDomainDepth);
    return pageGraph.getTpUrl(truncDomain, urlParts.pathname);
  }

  // Move the PageLoadData object for windowID to the staging area.
  // returns the staged PageLoadData object
  stage(windowID) {
    if (windowID in this._active) {
      this._active[windowID].setAsStaged();
      // make sure that we only stage http(s) pages
      if (['http', 'https'].indexOf(this._active[windowID].scheme) !== -1) {
        // push object to staging and save its id
        this._old_tab_idx[windowID] = this._staged.push(this._active[windowID]) - 1;
      }
      delete this._active[windowID];
      // return the staged object
      const stagedPage = this._staged[this._old_tab_idx[windowID]];
      // call stage listeners
      (this.listeners.get('stage') || []).forEach(cb => cb(windowID, stagedPage));
      return stagedPage;
    }
    return undefined;
  }

  // Periodically stage any tabs which are no longer active.
  // Will run at a period specifed by tp_events._clean_interval, unless force_clean is true
  // If force_stage is true, will stage all tabs, otherwise will only stage inactive.
  commit(forceClean = false, forceStage = false) {
    const now = (new Date()).getTime();
    if (now - this._last_clean > this._clean_interval || forceClean === true) {
      this._last_clean = now;
      return Promise.all(
        Object.keys(this._active).map(tabId =>
          browser.checkIsWindowActive(tabId).then((active) => {
            if (!active || forceStage === true) {
              if (this.debug) console.log(`Stage tab ${tabId}`, 'tp_events');
              this.stage(tabId);
            }
          }))
      );
    }

    return Promise.resolve();
  }

  // Push staged PageLoadData to human web.
  // Will run at a period specified by tp_events._push_interval, unless force_push is true.
  push(forcePush) {
    const now = (new Date()).getTime();
    if (this._staged.length > 0 && (now - this._last_push > this._push_interval
      || forcePush === true)) {
      // convert staged objects into simple objects, and aggregate.
      // then filter out ones with bad data (undefined hostname or no third parties)
      const payloadData = this._staged.filter(pl => !pl.private)
        .map(item => item.asPlainObject())
        .filter(item =>
          item.hostname.length > 0 && Object.keys(item.tps).length > 0);

      // if we still have some data, send the telemetry
      // if telemetryMode is 0, don't actually send it
      if (payloadData.length > 0 && this.config.telemetryMode !== TELEMETRY.DISABLED) {
        if (this.debug) console.log(`Pushing data for ${payloadData.length} requests`, 'tp_events');
        this.pushTelemetry(payloadData);
      }
      this._staged = [];
      this._old_tab_idx = {};
      this._last_push = now;
    }
  }

  incrementStat(reqLog, statKey, n) {
    if (reqLog !== null) {
      if (!(statKey in reqLog)) {
        reqLog[statKey] = 0;
      }
      if (!Number.isInteger(n)) {
        n = 1;
      }
      reqLog[statKey] += n;
    }
  }

  getPageForTab(tabId) {
    return this._active[tabId];
  }

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const listeners = this.listeners.get(event);
    listeners.push(callback);
  }

  removeEventListener(event, callback) {
    const index = this.listeners.get(event).indexOf(callback);
    if (index !== -1) {
      this.listeners.get(event).splice(index, 1);
    }
  }

  getOpenPages() {
    return Object.keys(this._active).map(id => this._active[id]);
  }

  getAnnotations(tab) {
    if (this._active[tab]) {
      return this._active[tab].annotations;
    }
    return {};
  }

  containsPlaceHolder(url) {
    return url.toString().indexOf(this.config.placeHolder > -1)
      && url.hostname !== this.config.placeHolder.split('/')[0];
  }
}

export default PageEventTracker;
