import { isCliqzBrowser, isAMO } from '../../core/platform';
import config from '../../core/config';
import { getGeneralDomain } from '../../core/tlds';
import Offer from '../offers/offer';
import UrlData from '../common/url_data';
import logger from '../common/offers_v2_logger';
import { LANDING_MONITOR_TYPE } from '../common/constant';

const POPUPS_INTERVAL = 30 * 60 * 1000; // 30 minutes

export default class CouponHandler {
  constructor({ offersHandler, core, popupNotification, offersDB }) {
    this.offersHandler = offersHandler;
    this.core = core;
    this.popupNotification = popupNotification;
    this.offersDB = offersDB;
    this._lastPopupNotificationMs = 0;
    this._encodeCouponAction = this._encodeCouponAction.bind(this);
  }

  // ------------------------------------------------------

  /**
   * This action will be called from the coupon-content script whenever we detect
   * a coupon has being used on the frontend.
   * @param offerInfo is the object containing the following information:
   *   offerInfo: {
   *     offerID: 'xyz', // the offer id
   *     code: 'xyz', // the coupon code of the offer (to inject it)
   *   },
   * @param couponValue the value of the code used, or empty if none
   * @param url where it was used
   *
   * format of args: { offerInfo, couponValue, url }
   */
  _couponFormUsed(args) {
    if (this.offersHandler) {
      // eslint-disable-next-line no-param-reassign
      args.urlData = new UrlData(args.url);
      this.offersHandler.couponFormUsed(args);
    }
  }

  _publishPopupPushEvent({ url, templateData = {}, offerInfo = {}, products = {}, attrs = {} }) {
    const msg = {
      target: 'offers-v2',
      data: {
        back: offerInfo,
        config: { ...offerInfo, ...templateData, products, attrs },
        preShow: 'try-to-find-coupon',
        onApply: 'insert-coupon-form',
        url,
      }
    };
    this.popupNotification.action('push', msg);
  }

  _publishDetectCouponActions(url, offerInfo) {
    this.core.action('callContentAction', 'offers-v2', 'detect-coupon-actions', { url }, {
      url,
      offerInfo,
    });
  }

  // Throttle popup notifications in addition to setup from backend
  _touchIfToPopupNotification(monitorCheck) {
    const { activate = false, offerInfo = {} } = monitorCheck;
    if (activate && offerInfo.autoFillField) {
      const ts = Date.now();
      if (ts - this._lastPopupNotificationMs > POPUPS_INTERVAL) {
        this._lastPopupNotificationMs = ts;
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------
  // Coupon activity detection
  // couponMsg is { type, couponValue, offerInfo }
  _onCouponActivity(couponMsg) {
    this.offersHandler.onCouponActivity(couponMsg, this._encodeCouponAction);
  }

  _encodeCouponAction({ type, couponValue }, { offerID }) {
    const handlers = {
      coupon_form_not_found: 'N',
      coupon_form_found: 'F',
      coupon_fail_minimal_basket_value: 'M',
      coupon_form_prices: () => this._onCouponPrices(couponValue, offerID),
      coupon_own_used: 'Y',
      coupon_other_used: 'C',
      coupon_empty: 'C',
      popnot_pre_show: () => (couponValue ? 'f' : 'n'),
      coupon_autofill_field_apply_action: 'y',
    };
    const code = handlers[type];
    return code.call ? code() : code;
  }

  /**
   * For prices:
   *
   * - generate delta from the last stored prices
   * - store the current prices
   * - serialize delta
   *
   * In the ideal world this function should be called from `_onCouponActivity`,
   * but here it is a part of `_encodeCouponAction`. The reason is that
   * the function needs `offerID`, which is revealed only inside monitor
   * signal processing.
   *
   * @param {string[]} prices
   * @param {string} offerID
   */
  _onCouponPrices(prices, offerID) {
    const { total, base } = prices;
    const oldPrices = this.offersDB.getShoppingCartDescribedPrices(offerID) || {};
    const { total: oldTotal, base: oldBase } = oldPrices;
    if ((total === oldTotal) && (base === oldBase)) {
      return 'Z'; // Zero delta: prices have not been changed
    }
    this.offersDB.setShoppingCartDescribedPrices(offerID, prices);
    const totalDelta = (total || 0) - (oldTotal || 0);
    const baseDelta = (base || 0) - (oldBase || 0);
    const baseDeltaStr = base === oldBase
      ? ''
      : `/${baseDelta.toFixed(2)}`;
    return `{D${totalDelta.toFixed(2)}${baseDeltaStr}}`;
  }

  // ------------------------------------------------------
  // Callbacks

  /**
   * On page with coupon input,
   * - start coupon actions detection, and
   * - show popup notification
   *
   * @param {CouponInfo+} monitorCheck -- from `OffersMonitorHandler::shouldActivateOfferForUrl`
   *   augmented with `url` and `module`
   * @return {boolean} true if popup-notification is shown, false otherwise
   */
  onDomReady(monitorCheck) {
    const { url, offerID, offerInfo } = monitorCheck;

    //
    // Always detect coupon actions
    //
    if (offerInfo) {
      this._publishDetectCouponActions(url, offerInfo);
    }

    //
    // If we can show popup notification, show it
    //
    if (!this._touchIfToPopupNotification(monitorCheck)) {
      return false;
    }
    const offer = this.offersHandler.getOfferObject(offerID);

    if (!offer) { return false; }

    const { ui_info: { template_data: templateData = {} } = {} } = offer;
    if (Object.keys(templateData).length === 0) {
      logger.log('offer for popup-notification with empty template_data: ', offer);
      return false;
    }
    this._publishPopupPushEvent({
      products: {
        ghostery: config.settings.channel === 'CH80',
        chip: config.settings.OFFERS_BRAND === 'chip',
        freundin: config.settings.OFFERS_BRAND === 'freundin',
        incent: config.settings.OFFERS_BRAND === 'incent',
        cliqz: isCliqzBrowser,
        amo: isAMO,
      },
      key: getGeneralDomain(url),
      url,
      templateData,
      offerInfo,
      attrs: {
        landing: new Offer(offer).getMonitorPatterns(LANDING_MONITOR_TYPE)
      }
    });

    return true;
  }

  onPopupPop(msg) {
    const { target, data: { ok, url, back, type } = {} } = msg;
    if (target !== 'offers-v2') { return; }
    const m = {
      cancel: 'coupon_autofill_field_cancel_action',
      x: 'coupon_autofill_field_x_action',
      outside: 'coupon_autofill_field_outside_action',
    };
    const couponValue = ok
      ? 'coupon_autofill_field_apply_action'
      : m[type] || 'coupon_autofill_field_unknown';
    this._couponFormUsed({
      url,
      offerInfo: back,
      couponValue,
    });
    if (couponValue === 'coupon_autofill_field_apply_action') {
      this._onCouponActivity({ type: couponValue, url, offerInfo: back });
    }
  }

  onPopupLog(msg) {
    const { target, data: { url, back, type, ok } = {} } = msg;
    if (target !== 'offers-v2') { return; }
    const m = {
      'pre-show': ['coupon_autofill_field_failed', false],
      'copy-code': ['coupon_autofill_field_copy_code', true],
      show: ['coupon_autofill_field_show', true],
    };
    const [couponValue, expectedResult] = m[type] || ['coupon_autofill_field_unknown', true];
    if (expectedResult === ok) {
      this._couponFormUsed({
        url,
        offerInfo: back,
        couponValue,
      });
    }
    if (type === 'pre-show') {
      this._onCouponActivity({ type: 'popnot_pre_show', url, couponValue: ok, offerInfo: back });
    }
  }

  couponFormUsed(args) {
    return this._onCouponActivity(args);
  }
}
