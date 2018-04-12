/**
 * This module will be in charge of handling the monitoring of offers and signals
 * Basically a monitor is a triple: (regex/pattern, offer_id, signal_id).
 * This is, for everytime that the pattern matches a url (or watch request) we
 * need to send a signal (signal_id) to an associated offer_id.
 *
 * Currently there are 2 types of events to be checked:
 * - url change
 * - web requests
 *
 * Depending on the offer (client), we need to perform any of them. This monitoring
 * module serves one of the most important information to our backend, since is
 * the way we measure conversions / leadings / etc.
 *
 * Whenever an offer is loaded (meaning it is in the DB), we start monitoring for
 * any possible signal associated to that offer / client. Once the offer expires
 * (i.e. we remove it from the DB) there are no more monitoring associated.
 */

import logger from '../common/offers_v2_logger';
import OffersConfigs from '../offers_configs';
import PersistentCacheDB from '../persistent_cache_db';
import { timestampMS } from '../utils';
import { buildMultiPatternIndex } from '../common/pattern-utils';

const REFERRER_CATEGORY_MAP = {
  // search cat
  google: 'search',
  yahoo: 'search',
  bing: 'search',
  duckduckgo: 'search'
  // meta-searchers?
};

/**
 * this will build the list of monitors data from a given offer. It will return
 * an empty list if cannot build any.
 */
const buildMonitorsFromOffer = (offerData) => {
  if (!offerData || !offerData.monitorData || !offerData.offer_id) {
    return [];
  }
  const result = [];
  offerData.monitorData.forEach((md) => {
    result.push({
      offerID: offerData.offer_id,
      signalID: md.signalID,
      type: md.type,
      params: md.params,
      patterns: md.patterns,
    });
  });
  return result;
};

// /////////////////////////////////////////////////////////////////////////////

/**
 * This method will check all the offers associated to the campaign and will
 * return the latest offer (id) updated and the campaign id of th one or null if none
 * { oid: offer_id, cid: campaignID }
 */
const getLatestUpdatedOfferFromCampaign = (offerID, offersDB) => {
  const campaignID = offersDB.getCampaignID(offerID);
  const campaignOffers = offersDB.getCampaignOffers(campaignID);
  if (!campaignOffers) {
    return null;
  }

  const latestUpdatedOffers = offersDB.getLatestUpdatedOffer(campaignOffers);
  if (!latestUpdatedOffers ||
      latestUpdatedOffers.length <= 0 ||
      !latestUpdatedOffers[0].offer_id) {
    return null;
  }
  return { oid: latestUpdatedOffers[0].offer_id, cid: campaignID };
};

/**
 * Get the referrer category
 */
const getReferrerCat = (referrerName) => {
  if (!referrerName || referrerName === '') {
    // it is none
    return 'none';
  }
  const refCat = REFERRER_CATEGORY_MAP[referrerName];
  if (!refCat) {
    // is other
    return 'other';
  }
  return refCat;
};

const sendSignal = (offersDB, sigHandler, offerId, key, referrer = null) => {
  if (!offerId || !key || !offersDB) {
    return false;
  }

  // get the campaign id for this offer if we have one.
  const campaignId = offersDB.getCampaignID(offerId);
  if (!campaignId) {
    return false;
  }

  // send the signal associated to the campaign using the origin trigger
  const originID = 'trigger';
  let result = sigHandler.setCampaignSignal(campaignId, offerId, originID, key);
  // we also add the referrer category here
  if (referrer !== null) {
    result = sigHandler.setCampaignSignal(campaignId, offerId, originID, referrer) &&
             result;
  }
  return result;
};


/**
 * This method will send the associated signal given the
 * @param monitor The Offer monitor containing all the information we need
 * @param handlers An object containing the:
 *        - sigHandler to send the signals
 *        - offersDB to access the offers
 *        - lastCampaignSignalDB for persistent data
 *        - urlSignalDB
 * @param offersDB Get the associated
 */
const sendMonitorSignal = (monitor, handlers, urlData) => {
  const currentOfferID = monitor.offerID;
  const latestUpdatedOfferResult = getLatestUpdatedOfferFromCampaign(
    currentOfferID,
    handlers.offersDB
  );
  if (!latestUpdatedOfferResult) {
    // nothing to do here
    return false;
  }
  const offerIDToUse = latestUpdatedOfferResult.oid;
  const campaignID = latestUpdatedOfferResult.cid;

  // check if we have monitor.params as arguments
  let sigToSend = monitor.signalID;
  let shouldFilterSignal = false;
  let referrerCat = null;
  if (monitor.params) {
    const currUrl = urlData.getLowercaseUrl();
    if (monitor.params.store && currUrl) {
      // we need to check on the DB the current url
      const sendSignalDb = handlers.urlSignalDB;
      const urlEntryCont = sendSignalDb.getEntryContainer(currUrl);
      if (urlEntryCont) {
        // we need to increment the counter
        urlEntryCont.data.counter += 1;
        // update the key
        sigToSend = `repeated_${monitor.signalID}`;
      } else {
        sendSignalDb.setEntryData(currUrl, { counter: 1 });
      }
    }

    if (monitor.params.filter_last_secs && monitor.params.filter_last_secs > 0) {
      const lastCmpSignalDB = handlers.lastCampaignSignalDB;
      let campaignMap = lastCmpSignalDB.getEntryData(campaignID);
      let lastUpdateTS = null;
      const now = timestampMS();
      if (!campaignMap) {
        // we need to create one
        campaignMap = {
          [monitor.signalID]: {
            counter: 1,
            l_u_ts: now
          }
        };
      } else {
        const keyMap = campaignMap[monitor.signalID];
        if (!keyMap) {
          campaignMap[monitor.signalID] = { counter: 1, l_u_ts: now };
        } else {
          campaignMap[monitor.signalID].counter += 1;
          lastUpdateTS = keyMap.l_u_ts;
          keyMap.l_u_ts = now;
        }
      }
      lastCmpSignalDB.setEntryData(campaignID, campaignMap);

      // check last update if we have it
      const deltaTime = (now - lastUpdateTS) / 1000;
      if (lastUpdateTS && (deltaTime <= monitor.params.filter_last_secs)) {
        shouldFilterSignal = true;
      }
    }

    if (monitor.params.referrer_cat) {
      // we get the referrer cat
      referrerCat = getReferrerCat(urlData.getReferrerName());
      if (referrerCat) {
        referrerCat = `ref_${referrerCat}`;
      }
    }
  }

  // check if we need to filter the signal or not
  let result = true;
  if (!shouldFilterSignal) {
    result = sendSignal(
      handlers.offersDB,
      handlers.sigHandler,
      offerIDToUse,
      sigToSend,
      referrerCat
    );
  }

  return result;
};

// /////////////////////////////////////////////////////////////////////////////

/**
 * This class will handle the databases needed for the monitors
 */
class MonitorDBHandler {
  constructor() {
    // here we need to create 2 new databases for the send_signal operation,
    // this is very nasty and we should move it away after the refactorization
    // for performance (put them on the send_signal operation object itself)
    const urlDBconfigs = {
      should_persist: OffersConfigs.SEND_SIG_OP_SHOULD_LOAD,
      old_entries_dt_secs: OffersConfigs.SEND_SIG_OP_EXPIRATION_SECS
    };
    // we will store here:
    // {
    //  url: {
    //    counter: N
    //  }
    // }
    // since we can get the last_update value from the container
    this.urlSignalsDB = new PersistentCacheDB('offers-signals-url', urlDBconfigs);
    this.urlSignalsDB.loadEntries();

    // we will store here the latest conversion that happened for a campaign id:
    // {
    //  cid: {
    //    sig_name: {
    //      counter: N,on
    //      l_u_ts: last timestamp happened.
    //    }
    //  }
    // }
    this.lastCampaignSignalDB = new PersistentCacheDB('offers-last-cmp-signals', urlDBconfigs);
    this.lastCampaignSignalDB.loadEntries();
  }
}

// /////////////////////////////////////////////////////////////////////////////
// Offer Monitor types
//

/**
 * Internal helper holder class
 */
class OfferMonitor {
  constructor({ offerID, signalID, params, patterns }) {
    this.offerID = offerID;
    this.signalID = signalID;
    this.params = params;
    this.patterns = patterns;
  }
  get type() {
    throw new Error('this should be implemented on the interface');
  }
}

class UrlChangeOfferMonitor extends OfferMonitor {
  get type() {
    return 'urlchange';
  }
}

class WebRequestOfferMonitor extends OfferMonitor {
  get type() {
    return 'webrequest';
  }
}

// /////////////////////////////////////////////////////////////////////////////
// Monitor handlers
//

class GenericMonitorHandler {
  /**
   * constructor
   * @param handlers = {
   *    sigHandler: this.sigHandler,
   *    offersDB: this.offersDB,
   *    lastCampaignSignalDB: this.monitorDBHandler.lastCampaignSignalDB;
   *    urlSignalDB: this.monitorDBHandler.urlSignalsDB,
   *  };
   */
  constructor(handlers) {
    this.handlers = handlers;
  }

  destroy() {
  }

  addMonitor(/* monitorData, id */) {
    throw new Error('inherited class should implement this');
  }

  removeMonitor(/* monitorID */) {
    throw new Error('inherited class should implement this');
  }

  build() {
    throw new Error('inherited class should implement this');
  }

  /**
   * Common function that will basically activate the monitor
   */
  activateMonitor(monitor, urlData) {
    // we now perform the activation
    try {
      logger.debug('Activating monitor', monitor);
      sendMonitorSignal(monitor, this.handlers, urlData);
    } catch (e) {
      logger.error('Something happened trying to send the signal for monitor', monitor);
    }
  }
}

class UrlChangeMonitorHandler extends GenericMonitorHandler {
  constructor(handlers, eventHandler) {
    super(handlers);
    this.eventHandler = eventHandler;
    this.monitorsMap = new Map();
    this.isDirty = false;
    this.patternsIndex = null;

    // subscribe here
    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);
  }

  destroy() {
    this.eventHandler.unsubscribeUrlChange(this.onUrlChange);
  }

  addMonitor(monitorData, id) {
    if (this.monitorsMap.has(id)) {
      return null;
    }
    this.isDirty = true;
    const monitor = new UrlChangeOfferMonitor(monitorData);
    this.monitorsMap.set(id, monitor);

    return monitor;
  }

  removeMonitor(monitorID) {
    if (!this.monitorsMap.has(monitorID)) {
      return;
    }
    this.isDirty = true;
    this.monitorsMap.delete(monitorID);
  }

  build() {
    if (!this.isDirty) {
      return;
    }
    const patternsData = [];
    this.monitorsMap.forEach((monitor, mid) => {
      // TODO: put the patterns in the proper format here
      patternsData.push({
        groupID: mid,
        patterns: monitor.patterns
      });
    });
    this.patternsIndex = buildMultiPatternIndex(patternsData);
    this.isDirty = false;
  }

  onUrlChange(urlData) {
    if (this.patternsIndex) {
      const monitorIDs = this.patternsIndex.match(urlData.getPatternRequest());
      monitorIDs.forEach(mid => this.activateMonitor(this.monitorsMap.get(mid), urlData));
    }
  }
}

class WebRequestMonitorHandler extends WebRequestOfferMonitor {
  constructor(handlers, eventHandler) {
    super(handlers);
    this.eventHandler = eventHandler;
    this.monitorsMap = new Map();
    this.isDirty = false;
    this.patternsIndex = null;
    this.domainsCountMap = new Map();
    this.webRequestCallback = this.webRequestCallback.bind(this);
  }

  addMonitor(monitorData, id) {
    if (this.monitorsMap.has(id)) {
      return null;
    }
    this.isDirty = true;
    const monitor = new WebRequestOfferMonitor(monitorData);
    this.monitorsMap.set(id, monitor);

    // check if we have to register the callback

    return monitor;
  }

  removeMonitor(monitorID) {
    if (!this.monitorsMap.has(monitorID)) {
      return;
    }
    this.isDirty = true;
    const monitor = this.monitorsMap.get(monitorID);
    const domain = monitor.domain;

    // check if we need to remove the subscription here
    this.domainsCountMap.set(domain, this.domainsCountMap.get(domain) - 1);
    if (this.domainsCountMap.get(domain) <= 0) {
      this.domainsCountMap.delete(domain);
      this.eventHandler.unsubscribeHttpReq(this.webRequestCallback, domain);
    }

    this.monitorsMap.delete(monitorID);
  }

  build() {
    if (!this.isDirty) {
      return;
    }
    this.domainsCountMap.clear();

    // build here using all the patterns we have
    const patternsData = [];
    this.monitorsMap.forEach((monitor, mid) => {
      // TODO: put the patterns in the proper format here
      patternsData.push({
        groupID: mid,
        patterns: monitor.patterns
      });
      // check if we need to subscribe for the current domain
      if (!this.domainsCountMap.has(monitor.domain) ||
          this.domainsCountMap.get(monitor.domain) === 0) {
        this.domainsCountMap.set(monitor.domain, 1);
      } else {
        this.domainsCountMap.set(monitor.domain, this.domainsCountMap.get(monitor.domain) + 1);
        this.eventHandler.subscribeHttpReq(this.webRequestCallback, monitor.domain);
      }
    });

    this.patternsIndex = buildMultiPatternIndex(patternsData);
    this.isDirty = false;
  }

  webRequestCallback(data) {
    if (this.patternsIndex) {
      const urlData = data.url_data;
      const monitorIDs = this.patternsIndex.match(urlData.getPatternRequest());
      monitorIDs.forEach(mid => this.activateMonitor(this.monitorsMap.get(mid), urlData));
    }
  }
}


/**
 * Class to handle and activate monitors
 */
export default class OffersMonitorHandler {
  constructor(sigHandler, offersDB, eventHandler) {
    this.offersDB = offersDB;
    this.sigHandler = sigHandler;
    this.monitorDBHandler = new MonitorDBHandler();

    // check if the offers db is loaded
    if (offersDB.dbLoaded) {
      const allOffersMeta = this.offersDB.getOffers({ includeRemoved: false });
      allOffersMeta.forEach(om => this.addOfferMonitors(om.offer));
      this.build();
    }

    // since this will only stay in memory
    this.monitorIDCount = 0;
    this.monitorMap = new Map();
    // offer_id -> Set{monitorID1, monitorID2, ...}
    this.offerIDToMonitorIDsMap = new Map();
    // we will have 2 types of patterns, one for web request and one for url
    // change
    const handlers = {
      sigHandler: this.sigHandler,
      offersDB: this.offersDB,
      lastCampaignSignalDB: this.monitorDBHandler.lastCampaignSignalDB,
      urlSignalDB: this.monitorDBHandler.urlSignalsDB,
    };

    this.monitorHandlers = {
      urlchange: new UrlChangeMonitorHandler(handlers, eventHandler),
      webrequest: new WebRequestMonitorHandler(handlers, eventHandler),
    };

    this._offersDBCallback = this._offersDBCallback.bind(this);
    this.offersDB.registerCallback(this._offersDBCallback);
  }

  destroy() {
    this.offersDB.unregisterCallback(this._offersDBCallback);

    this.offerIDToMonitorIDsMap.forEach((monitorIDs, offerID) =>
      this.removeOfferMonitors(offerID));

    Object.keys(this.monitorHandlers).forEach(hn => this.monitorHandlers[hn].destroy());
  }

  /**
   * Will generate all the monitors needed for this offer and track it here.
   * For more information check _addOfferMonitor()
   */
  addOfferMonitors(offerData) {
    buildMonitorsFromOffer(offerData).forEach(md => this._addOfferMonitor(md));
  }

  /**
   * will remove all the associated monitors for the given offerID
   */
  removeOfferMonitors(offerID) {
    if (!this.offerIDToMonitorIDsMap.has(offerID)) {
      return;
    }
    // now we should each of them
    this.offerIDToMonitorIDsMap.get(offerID).forEach((monitorID) => {
      const monitor = this.monitorMap.get(monitorID);
      if (monitor === undefined || !this.monitorHandlers[monitor.type]) {
        logger.error('The monitor is invalid or unknown type? ', monitorID);
        return;
      }
      this.monitorHandlers[monitor.type].removeMonitor(monitorID);
    });
    this.offerIDToMonitorIDsMap.delete(offerID);
  }

  /**
   * Should be called after we added / removed the offers monitors.
   * Note that not calling this method the latest added monitors will not have
   * effect and the removal will still be processed.
   */
  build() {
    Object.keys(this.monitorHandlers).forEach(hn => this.monitorHandlers[hn].build());
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                             PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _isMonitorDataValid(monitorData) {
    return monitorData &&
      monitorData.offerID &&
      monitorData.signalID &&
      ((monitorData.type === 'webrequest' && monitorData.domain) ||
       (monitorData.type === 'urlchange')) &&
      (monitorData.patterns && monitorData.patterns.length > 0) &&
      (!monitorData.patterns.some(p => p.length === 0));
  }

  /**
   * Add a new monitor, where
   * @param {object} monitorData:
   * {
   *   offerID: the unique offer id identifying the offer,
   *   signalID: the signal we want to send when activating the monitor,
   *   type: can be either 'webrequest' or 'urlchange' type,
   *
   *   // this is required if type === 'webrequest'
   *   domain: XYZ, // where we will watch the requests
   *
   *   // params are optional
   *   params: {
   *     // will be used to store the url where the signal will be sent getting it
   *     // from the context (current url). If the store is true and the url is on
   *     // the DB then we will change the signal name to repeated_ + signal_name.
   *     // On store == true we will also store the current url if not added before
   *     // If store == false we will not do anything described above.
   *     // Note that if the monitor contains multiple patterns (different urls),
   *     // the 'repeated_' prefix will be added per pattern, meaning that if
   *     // p1, p2, are patterns for signal 's1', the user visiting p1 will
   *     // trigger 's1', user visiting p2 will trigger again 's1' and if the user
   *     // visit now either p1 or p2 then will trigger 'repeated_s1'.
   *     store: true / false,
   *
   *     // this parameter will be used (if present) to check when was the last signal
   *     // with the same name for the same campaign associated, and if exists we will
   *     // check the delta time from now to the last time we sent this signal.
   *     // in that case we will filter every signal that happened in that period of time
   *     // (now - last_signal_ts).
   *     // if this field is null or <= 0 nothing will be checked / filtered.
   *     filter_last_secs: N,
   *
   *     // should we include the referrer category?
   *     referrer_cat: true / false,
   *   },
   *   patterns: ["adblocker pattern"]
   * }
   */
  _addOfferMonitor(monitorData) {
    if (!this._isMonitorDataValid(monitorData)) {
      logger.error('Invalid monitor data being set: ', monitorData);
      return;
    }
    // check if we already have the monitor
    if (this._hasMonitor(monitorData)) {
      return;
    }

    this.monitorIDCount += 1;
    const monitorID = this.monitorIDCount;
    const monitor = this.monitorHandlers[monitorData.type].addMonitor(monitorData, monitorID);
    if (monitor === null) {
      logger.error('Something went wrong creating a monitor', monitorData);
      return;
    }

    // add the ids
    this.monitorMap.set(monitorID, monitor);
    if (this.offerIDToMonitorIDsMap.has(monitorData.offerID)) {
      this.offerIDToMonitorIDsMap.get(monitorData.offerID).add(monitorID);
    } else {
      this.offerIDToMonitorIDsMap.set(monitorData.offerID, new Set([monitorID]));
    }
  }

  _hasMonitor(md) {
    if (!this.offerIDToMonitorIDsMap.has(md.offerID)) {
      return false;
    }
    let hasMonitor = false;
    this.offerIDToMonitorIDsMap.get(md.offerID).forEach((mid) => {
      hasMonitor = hasMonitor || this.monitorMap.get(mid).signalID === md.signalID;
    });
    return hasMonitor;
  }

  /**
   * we will receive the offers db callback here to be able to track new offers
   * changes and more
   */
  _offersDBCallback(e) {
    // check if the DB is loaded
    if (e.evt === 'offers-db-loaded') {
      // we need to build this
      const allOffersMeta = this.offersDB.getOffers({ includeRemoved: false });
      allOffersMeta.forEach(om => this.addOfferMonitors(om.offer));
      this.build();
      return;
    }

    // else is either removed or updated or added
    const shouldRemove = e.evt === 'offer-removed' || e.evt === 'offer-updated';
    const shouldAdd = e.evt === 'offer-added' || e.evt === 'offer-updated';
    if (shouldRemove) {
      this.removeOfferMonitors(e.offer.offer_id);
    }
    if (shouldAdd) {
      this.addOfferMonitors(e.offer);
    }

    if (shouldAdd || shouldRemove) {
      this.build();
    }
  }
}

