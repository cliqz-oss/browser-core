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
import MonitorDBHandler from './monitor/monitor-db';
import {
  UrlChangeMonitorHandler,
  WebRequestMonitorHandler,
  CouponMonitorHandler
} from './monitor/handlers';

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
    const monitorInfo = {
      offerID: offerData.offer_id,
      signalID: md.signalID,
      type: md.type,
      params: md.params,
      patterns: md.patterns,
    };
    if (md.type === 'webrequest') {
      monitorInfo.domain = md.domain;
    } else if (md.type === 'coupon') {
      monitorInfo.couponInfo = md.couponInfo;
      // take the code from the offer itself, which is located in
      // ui_info -> template_data -> code
      const code = (offerData.ui_info &&
        offerData.ui_info.template_data &&
        offerData.ui_info.template_data.code) ?
        offerData.ui_info.template_data.code : '';
      monitorInfo.couponInfo.code = code;
    }

    result.push(monitorInfo);
  });
  return result;
};


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
      coupon: new CouponMonitorHandler(handlers),
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

  /**
   * This method will check if a given url should activate or not a particular monitor
   * If so will return the following information:
   * {
   *   activate: true, // or false depending,
   *   // if activate == true:
   *   offerInfo: {
   *     monitorID: the offer id associated to that url,
   *     code: the coupon code if any associated to that offer,
   *     autoFillField: true | false // saying if we should autofill or not the field
   *   }
   * }
   */
  shouldActivateOfferForUrl(urlData) {
    return this.monitorHandlers.coupon.shouldActivateOfferForUrl(urlData);
  }

  /**
   * whenever we detect a coupon used, check handlers.es:couponFormUsed
   */
  couponFormUsed(args) {
    this.monitorHandlers.coupon.couponFormUsed(args);
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                             PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _isMonitorDataValid(monitorData) {
    return monitorData &&
      monitorData.offerID &&
      monitorData.signalID &&
      ((monitorData.type === 'webrequest' && monitorData.domain) ||
       (monitorData.type === 'urlchange') ||
       (monitorData.type === 'coupon' && monitorData.couponInfo)) &&
      (monitorData.patterns && monitorData.patterns.length > 0) &&
      (!monitorData.patterns.some(p => p.length === 0));
  }

  /**
   * Add a new monitor, where
   * @param {object} monitorData:
   * {
   *   offerID: the unique offer id identifying the offer,
   *   signalID: the signal we want to send when activating the monitor,
   *   type: can be either 'webrequest' or 'urlchange' or 'coupon' type,
   *
   *   // this is required if type === 'webrequest'
   *   domain: XYZ, // where we will watch the requests for the webrequest
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
   *
   *   // if the type == 'coupon' we will have this additional information:
   *   couponInfo: {
   *     code: (THIS WILL BE AUTOMATICALLY SET ON THE EXTENSION, taking it from the offer)
   *     autoFillField: true | false // saying if we should autofill or not the field
   *   }
   * }
   */
  _addOfferMonitor(monitorData) {
    if (!this._isMonitorDataValid(monitorData)) {
      logger.info('Invalid monitor data being set, discarding it: ', monitorData);
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

