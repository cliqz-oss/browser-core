import { buildSimplePatternIndex } from '../../common/pattern-utils';
import logger from '../../common/offers_v2_logger';
import sendMonitorSignal from './utils';

/**
 * Internal helper holder class
 */
export class OfferMonitor {
  constructor({ offerID, signalID, params, patterns }) {
    this.offerID = offerID;
    this.signalID = signalID;
    this.params = params;
    this.patterns = patterns;
  }
  get type() {
    throw new Error('this should be implemented on the interface');
  }

  destroy() {
  }
}

export class UrlChangeOfferMonitor extends OfferMonitor {
  get type() {
    return 'urlchange';
  }
}

export class WebRequestOfferMonitor extends OfferMonitor {
  constructor(args, handlers) {
    super(args);
    this.domain = args.domain;
    this.webRequestCallback = this.webRequestCallback.bind(this);
    this.handlers = handlers;
  }

  get type() {
    return 'webrequest';
  }

  activate() {
    if (this.isActive()) {
      return;
    }
    // else we need to build the simple pattern index
    this.simplePatternIndex = buildSimplePatternIndex(this.patterns);
  }

  isActive() {
    return this.simplePatternIndex !== undefined;
  }

  matchTokenizedUrl(url) {
    return this.isActive() && this.simplePatternIndex.match(url);
  }

  webRequestCallback(reqObj) {
    // here we need to check if the requested url matches the current
    // match and if it does we need to send a signal
    const urlData = reqObj.url_data;
    const match = this.simplePatternIndex &&
      this.simplePatternIndex.match(urlData.getPatternRequest());
    if (match) {
      try {
        logger.debug('Activating monitor', this);
        sendMonitorSignal(this, this.handlers, urlData);
      } catch (e) {
        logger.error('Something happened trying to send the signal for monitor', this);
      }
    }
  }
}

export class CouponMonitor extends OfferMonitor {
  constructor(args) {
    super(args);
    // we will store also coupon information here
    this._couponInfo = args.couponInfo || {};
    // by default we will not autofill the field
    if (this._couponInfo.autoFillField === undefined) {
      this._couponInfo.autoFillField = false;
    }
  }

  get type() {
    return 'coupon';
  }

  destroy() {
  }

  get couponInfo() {
    return this._couponInfo;
  }
}
