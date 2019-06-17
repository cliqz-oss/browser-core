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
import { buildMultiPatternIndexPatternAsID } from '../common/pattern-utils';
import sendMonitorSignal from './monitor/utils';
import moment from '../../platform/lib/moment';

const URLCHANGE_TYPE = 'urlchange';
const WEBREQUEST_TYPE = 'webrequest';
const COUPON_TYPE = 'coupon';

/**
 * this will build the list of monitors data from a given offer. It will return
 * an empty list if cannot build any.
 */
const buildMonitorsFromOffer = (offer) => {
  const offerData = offer.offer;
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
      click: offer.click,
      view: offer.view,
      last_update: offer.last_update
    };
    if (md.type === 'webrequest') {
      monitorInfo.domain = md.domain;
    } else if (md.type === 'coupon') {
      monitorInfo.couponInfo = md.couponInfo;
      // take the code from the offer itself, which is located in
      // ui_info -> template_data -> code
      const code = (offerData.ui_info
        && offerData.ui_info.template_data
        && offerData.ui_info.template_data.code)
        ? offerData.ui_info.template_data.code : '';
      monitorInfo.couponInfo.code = code;

      if (md.couponInfo.autoFillField === undefined) {
        monitorInfo.couponInfo.autoFillField = false;
      }
    }

    result.push(monitorInfo);
  });
  return result;
};

/**
 * This method will select all monitors for the last activated offer
 * where last activated means last clicked, last seen, last updated
 * If will return the list of all monitors for this offer
 */
const selectActiveMonitors = (activeMonitors) => {
  if (activeMonitors.length === 0) {
    return [];
  }
  activeMonitors.sort((a, b) =>
    // find the first of these fields that is not empty for any of the values
    ((b.click || 0) - (a.click || 0)) || ((b.view || 0) - (a.view || 0))
    || ((b.last_update || 0) - (a.last_update || 0)) || 0);
  const offerID = activeMonitors[0].offerID;

  return activeMonitors.map((mit) => {
    if (mit.offerID === offerID) {
      return mit;
    }

    const repMonitor = Object.assign({}, mit);
    repMonitor.signalID = `repeated_${mit.signalID}`;
    return repMonitor;
  });
};

const getSignalNameForCoupon = (offerCouponCodes, couponUsed) => {
  const autofillWhiteList = [
    'coupon_autofill_field_apply_action',
    'coupon_autofill_field_cancel_action',
    'coupon_autofill_field_copy_code',
    'coupon_autofill_field_failed',
    'coupon_autofill_field_outside_action',
    'coupon_autofill_field_show',
    'coupon_autofill_field_unknown',
    'coupon_autofill_field_x_action',
    'coupon_autofill_field_success_use',
    'coupon_autofill_field_error_use',
    'coupon_autofill_field_application_not_found',
  ];
  if (autofillWhiteList.includes(couponUsed)) {
    return couponUsed;
  }
  const lUsedCode = couponUsed.toLowerCase();
  if (lUsedCode.length === 0) {
    return 'coupon_empty';
  }
  if (offerCouponCodes.some(code => code.toLowerCase() === lUsedCode)) {
    return 'coupon_own_used';
  }
  return 'coupon_other_used';
};

/**
 * Class to handle and activate monitors
 */
export default class OffersMonitorHandler {
  constructor(sigHandler, offersDB, eventHandler) {
    this.offersDB = offersDB;
    this.sigHandler = sigHandler;
    this.monitorDBHandler = new MonitorDBHandler();
    this.eventHandler = eventHandler;

    this.monitors = {};
    this.monitors[URLCHANGE_TYPE] = { patterns: {}, index: null };
    this.monitors[WEBREQUEST_TYPE] = { patterns: {}, index: null };
    this.monitors[COUPON_TYPE] = { patterns: {}, index: null };

    this._getOffersAndRebuildMonitors();

    this.handlers = {
      sigHandler: this.sigHandler,
      offersDB: this.offersDB,
      lastCampaignSignalDB: this.monitorDBHandler.lastCampaignSignalDB,
      urlSignalDB: this.monitorDBHandler.urlSignalsDB,
    };

    this._offersDBCallback = this._offersDBCallback.bind(this);
    this.offersDB.registerCallback(this._offersDBCallback);


    // Register for urlchanges
    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);


    // Register for webrequests
    this.webRequestCallback = this.webRequestCallback.bind(this);
  }

  destroy() {
    this.offersDB.unregisterCallback(this._offersDBCallback);

    this.eventHandler.unsubscribeUrlChange(this.onUrlChange);

    Object.keys(this.monitors).forEach(type =>
      this.removeOfferMonitors(type));
  }

  /**
   * Will generate all the monitors needed for this offer and track it here.
   * For more information check _addOfferMonitor()
   */
  addOfferMonitors(offer) {
    buildMonitorsFromOffer(offer).forEach(md => this._addOfferMonitor(md));
  }

  /**
   * will remove all the associated monitors for the given offerID
   */
  removeOfferMonitors(offer) {
    const domains = new Set();
    buildMonitorsFromOffer(offer).forEach(md =>
      this._removeOfferMonitor(md).forEach(domain => domains.add(domain)));

    // Before unsubscribing a domain from the eventhandler we need to
    // verify it is not used by still active monitors
    const allDomains = new Set();
    Object.keys(this.monitors[WEBREQUEST_TYPE].patterns)
      .map(pattern =>
        this.monitors[WEBREQUEST_TYPE].patterns[pattern].map(mon =>
          allDomains.add(mon.domain)));
    [...domains].forEach((domain) => {
      if (!(allDomains.has(domain))) {
        this.eventHandler.unsubscribeHttpReq(this.webRequestCallback, domain);
      }
    });
  }

  /**
   * Should be called after we added / removed the offers monitors.
   * Note that not calling this method the latest added monitors will not have
   * effect and the removal will still be processed.
   */
  build() {
    Object.keys(this.monitors).forEach((type) => {
      this.monitors[type].index = buildMultiPatternIndexPatternAsID(
        Object.keys(this.monitors[type].patterns)
      );
    });
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
    if (!this.monitors[COUPON_TYPE].index) {
      return { activate: false };
    }
    const patterns = this.monitors[COUPON_TYPE].index.match(urlData.getPatternRequest());

    if (patterns.size === 0) {
      // nothing to activate here
      return { activate: false };
    }

    const allActiveMonitors = [...patterns].map(pattern =>
      this.monitors[COUPON_TYPE].patterns[pattern])
      .reduce((activeMonitors, monitor) => activeMonitors.concat(monitor), []);

    const activeOffer = selectActiveMonitors(allActiveMonitors)[0];
    const couponInfo = JSON.parse(JSON.stringify(activeOffer.couponInfo));
    couponInfo.pattern = activeOffer.patterns[0];
    const pastDay = moment() - 24 * 60 * 60 * 1000;
    const autoFillField = couponInfo.autoFillField
      && (activeOffer.click > pastDay || activeOffer.view > pastDay);
    couponInfo.autoFillField = autoFillField;
    logger.log('shouldActivateOfferForUrl: autoFillField:', autoFillField, ' for:', JSON.stringify(activeOffer));
    return {
      offerID: activeOffer.offerID,
      offerInfo: couponInfo,
      activate: true
    };
  }

  /**
   * whenever we detect a coupon used, check handlers.es:couponFormUsed
   */
  couponFormUsed(args) {
    const couponInfo = args.offerInfo || {};
    // by default we will not autofill the field
    if (couponInfo.autoFillField === undefined) {
      couponInfo.autoFillField = false;
    }
    // now we detect if the coupon has being used or not here and we send the
    // the according data here
    const activeMonitors = this.monitors[COUPON_TYPE].patterns[couponInfo.pattern];
    const couponValues = activeMonitors.map((monitor) => {
      if (monitor.couponInfo && monitor.couponInfo.code) {
        return monitor.couponInfo.code;
      }
      return undefined;
    }).filter(x => x !== undefined);

    const signalName = getSignalNameForCoupon(couponValues, args.couponValue);
    const monitor = selectActiveMonitors(activeMonitors)[0];
    monitor.signalID = signalName;
    sendMonitorSignal(monitor, this.handlers, args.urlData);
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                             PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _isMonitorDataValid(monitorData) {
    return monitorData
      && monitorData.offerID
      && monitorData.signalID
      && ((monitorData.type === 'webrequest' && monitorData.domain)
       || (monitorData.type === 'urlchange')
       || (monitorData.type === 'coupon' && monitorData.couponInfo))
      && (monitorData.patterns && monitorData.patterns.length > 0)
      && (!monitorData.patterns.some(p => p.length === 0));
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

    const monitorType = monitorData.type;
    if (!(monitorType in this.monitors)) {
      this.monitors[monitorType] = { patterns: {}, index: null };
    }

    monitorData.patterns.forEach((pattern) => {
      if (!(pattern in this.monitors[monitorType].patterns)) {
        this.monitors[monitorType].patterns[pattern] = [];
      }
      this.monitors[monitorType].patterns[pattern].push(monitorData);
    });

    if (monitorType === WEBREQUEST_TYPE) {
      this.eventHandler.subscribeHttpReq(this.webRequestCallback, monitorData.domain);
    }
  }

  _removeOfferMonitor(monitorData) {
    const monitorType = monitorData.type;
    const domains = new Set();
    monitorData.patterns.forEach((pattern) => {
      // Can happen if the backend sends the same pattern multiple times for the
      // same signalID, e.g. for _coupon_
      if (!(pattern in this.monitors[monitorType].patterns)) {
        return;
      }
      const editedList = this.monitors[monitorType].patterns[pattern].filter((offer) => {
        if (monitorData.offerID === offer.offerID && monitorData.signalID === offer.signalID) {
          domains.add(offer.domain);
          return false;
        }
        return true;
      });
      this.monitors[monitorType].patterns[pattern] = editedList;

      if (this.monitors[monitorType].patterns[pattern].length === 0) {
        delete this.monitors[monitorType].patterns[pattern];
      }
    });

    return domains;
  }

  checkUrl(urlData, monitorType) {
    const monitorIndex = this.monitors[monitorType].index;
    if (monitorIndex === null) {
      return;
    }

    const patterns = monitorIndex.match(urlData.getPatternRequest());

    const allActiveMonitors = [...patterns].map(
      pattern => this.monitors[monitorType].patterns[pattern]
    ).reduce((activeMonitors, monitor) => activeMonitors.concat(monitor), []);

    // Only send signals for the last clicked or if none clicked the last pushed campaign
    selectActiveMonitors(allActiveMonitors).forEach((mid) => {
      sendMonitorSignal(mid, this.handlers, urlData);
    });
  }

  onUrlChange(urlData) {
    this.checkUrl(urlData, URLCHANGE_TYPE);
  }

  webRequestCallback(reqObj) {
    // here we need to check if the requested url matches the current
    // match and if it does we need to send a signal
    const urlData = reqObj.url_data;
    this.checkUrl(urlData, WEBREQUEST_TYPE);
  }

  _getOffersAndRebuildMonitors() {
    this.monitors = {};
    this.monitors[URLCHANGE_TYPE] = { patterns: {}, index: null };
    this.monitors[WEBREQUEST_TYPE] = { patterns: {}, index: null };
    this.monitors[COUPON_TYPE] = { patterns: {}, index: null };
    const allOffersMeta = this.offersDB.getOffers({ includeRemoved: false });
    allOffersMeta.forEach(om => this.addOfferMonitors(om));
    this.build();
  }

  /**
   * we will receive the offers db callback here to be able to track new offers
   * changes and more
   */
  _offersDBCallback(e) {
    // For removing we need to make sure to unsubscribe
    // so loadAndRebuild wouldn't be enough
    const shouldRemove = e.evt === 'offer-removed' || e.evt === 'offer-updated';
    if (shouldRemove) {
      logger.log('Monitoring, should remove evt:', e);
      this.removeOfferMonitors(e);
    }
    // this is definitely excessive and probably expensive
    // still we would need to change a lot of messages to update all of them
    // with the missing information
    this._getOffersAndRebuildMonitors();
  }
}
