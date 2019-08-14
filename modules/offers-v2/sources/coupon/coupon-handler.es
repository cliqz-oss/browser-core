import config from '../../core/config';
import { getGeneralDomain } from '../../core/tlds';
import UrlData from '../common/url_data';
import logger from '../common/offers_v2_logger';

const POPUPS_INTERVAL = 30 * 60 * 1000; // 30 minutes

export default class CouponHandler {
  constructor({ offersHandler, core, popupNotification }) {
    this.offersHandler = offersHandler;
    this.core = core;
    this.popupNotification = popupNotification;
    this._lastPopupNotificationMs = 0;
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

  _publishPopupPushEvent({ templateData = {}, offerInfo = {}, products = {} }) {
    const msg = {
      target: 'offers-v2',
      data: {
        back: offerInfo,
        config: { ...offerInfo, ...templateData, products },
        preShow: 'try-to-find-coupon',
        onApply: 'insert-coupon-form'
      }
    };
    this.popupNotification.action('push', msg);
  }

  _publishDetectCouponActions(url, offerInfo) {
    const msg = {
      target: 'offers-v2',
      action: 'detect-coupon-actions',
      url,
      offerInfo,
    };
    this.core.action('broadcastMessage', url, msg);
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
        chip: config.settings['chip-standalone.enabled'],
        freundin: config.settings['freundin-standalone.enabled'],
        incent: config.settings['incent-standalone.enabled'],
      },
      key: getGeneralDomain(url),
      templateData,
      offerInfo,
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
    if (expectedResult !== ok) { return; }
    this._couponFormUsed({
      url,
      offerInfo: back,
      couponValue,
    });
  }

  couponFormUsed(args) {
    this._couponFormUsed(args);
  }
}
