import { buildMultiPatternIndex } from '../../common/pattern-utils';
import logger from '../../common/offers_v2_logger';
import sendMonitorSignal from './utils';
import {
  UrlChangeOfferMonitor,
  WebRequestOfferMonitor,
  CouponMonitor
} from './monitors';

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

// /////////////////////////////////////////////////////////////////////////////

export class UrlChangeMonitorHandler extends GenericMonitorHandler {
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

// /////////////////////////////////////////////////////////////////////////////

export class WebRequestMonitorHandler extends GenericMonitorHandler {
  constructor(handlers, eventHandler) {
    super(handlers);
    this.eventHandler = eventHandler;
    this.monitorsMap = new Map();
    this.isDirty = false;
    this.patternsIndex = null;
    this.onUrlChange = this.onUrlChange.bind(this);
    this.eventHandler.subscribeUrlChange(this.onUrlChange);
  }

  destroy() {
    this.eventHandler.unsubscribeUrlChange(this.onUrlChange);
    this._clearMonitors();
  }

  addMonitor(monitorData, id) {
    if (this.monitorsMap.has(id)) {
      return null;
    }
    this.isDirty = true;
    const monitor = new WebRequestOfferMonitor(monitorData, this.handlers);
    this.monitorsMap.set(id, monitor);
    return monitor;
  }

  removeMonitor(monitorID) {
    if (!this.monitorsMap.has(monitorID)) {
      return;
    }
    this.isDirty = true;
    const monitor = this.monitorsMap.get(monitorID);
    const domain = monitor.domain;

    // unsubscribe the webrequest call if any
    this.eventHandler.unsubscribeHttpReq(monitor.webRequestCallback, domain);
    this.monitorsMap.delete(monitorID);
  }

  build() {
    if (!this.isDirty) {
      return;
    }
    // we will build the activation index here using the domain as activation
    const patternsData = [];
    this.monitorsMap.forEach((monitor, mid) => {
      patternsData.push({
        groupID: mid,
        patterns: [`||${monitor.domain}`]
      });
    });
    this.patternsIndex = buildMultiPatternIndex(patternsData);
    this.isDirty = false;
  }

  onUrlChange(urlData) {
    if (this.patternsIndex) {
      const monitorIDs = this.patternsIndex.match(urlData.getPatternRequest());
      monitorIDs.forEach(mid => this._activateWebrequestMonitor(this.monitorsMap.get(mid)));
    }
  }

  _activateWebrequestMonitor(monitor) {
    if (!monitor || monitor.isActive()) {
      // nothing to do
      return;
    }
    // activate the monitor and register
    monitor.activate();
    this.eventHandler.subscribeHttpReq(monitor.webRequestCallback, monitor.domain);
  }

  _clearMonitors() {
    this.monitorsMap.forEach((monitor, mid) => {
      this.removeMonitor(mid);
    });
  }
}


// /////////////////////////////////////////////////////////////////////////////
//                                 COUPONS

/**
 * this method will generate the signal name given the coupon of the offer and
 * the one used by the user
 */
const getSignalNameForCoupon = (offerCouponCode, couponUsed) => {
  const lCouponCode = offerCouponCode.toLowerCase();
  const lUsedCode = couponUsed.toLowerCase();
  if (lUsedCode.length === 0) {
    return 'coupon_empty';
  }
  if (lCouponCode === lUsedCode) {
    return 'coupon_own_used';
  }
  return 'coupon_other_used';
};

// /////////////////////////////////////////////////////////////////////////////
/**
 * This class will keep the same interface but will also add some extra functionailties
 * given the nature of how we handle injected content on the browser.
 */
export class CouponMonitorHandler extends GenericMonitorHandler {
  constructor(handlers) {
    super(handlers);
    this.monitorsMap = new Map();
    this.isDirty = false;
    this.patternsIndex = null;
  }

  destroy() {
  }

  addMonitor(monitorData, id) {
    if (this.monitorsMap.has(id)) {
      return null;
    }
    this.isDirty = true;
    const monitor = new CouponMonitor(monitorData);
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
    const monitorIDs = this.patternsIndex ?
      this.patternsIndex.match(urlData.getPatternRequest()) :
      new Set();

    if (monitorIDs.size === 0) {
      // nothing to activate here
      return { activate: false };
    }

    // here if we have more than one then is a problem since we only support 1
    // per url per now.
    const monitorID = [...monitorIDs.keys()][0];
    const selectedMonitor = this.monitorsMap.get(monitorID);
    if (monitorIDs.size > 1) {
      logger.error('We have more than one coupon monitor for a given url... ');
    }
    const offerInfo = selectedMonitor.couponInfo;
    offerInfo.monitorID = monitorID;
    return { offerInfo, activate: true };
  }

  /**
   * This method will be called with the same information was sent to the
   * content script whenever we detect a coupon has being used
   */
  couponFormUsed({ offerInfo, couponValue, urlData }) {
    // whenever we use a copun
    if (!offerInfo ||
        !offerInfo.monitorID ||
        !this.monitorsMap.has(offerInfo.monitorID)) {
      logger.error('invalid offer information or monitor id', offerInfo);
    }
    // now we detect if the coupon has being used or not here and we send the
    // the according data here
    const signalName = getSignalNameForCoupon(offerInfo.code, couponValue);
    const monitor = this.monitorsMap.get(offerInfo.monitorID);
    if (!signalName || !monitor) {
      logger.error('invalid signal name or monitor');
      return;
    }
    // we set the signal id dynamically
    monitor.signalID = signalName;
    this.activateMonitor(monitor, urlData);
  }
}
