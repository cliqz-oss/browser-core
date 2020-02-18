import events from '../../core/events';
import config from '../../core/config';
import { extractHostname } from '../../core/tlds';
import Offer from '../offers/offer';
import UrlData from '../common/url_data';
import logger from '../common/offers_v2_logger';
import { LANDING_MONITOR_TYPE } from '../common/constant';
import CouponSignal from './coupon-signal';
import CheckoutReminder from './checkout-reminder';

const CHECKOUT_JOURNEYS = Object.freeze([
  'close',
  'copy',
  'apply',
]);

export default class CouponHandler {
  constructor({ offersHandler, core, offersDB }) {
    this.offersHandler = offersHandler;
    this.core = core;
    this._lastPopupNotificationMs = 0;
    const couponSignal = new CouponSignal(offersDB);
    this._encodeCouponAction = couponSignal.encodeCouponAction.bind(couponSignal);
    this.checkoutReminder = new CheckoutReminder();
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

  _publishDetectCouponActions(url, offerInfo) {
    this.core.action('callContentAction', 'offers-v2', 'detect-coupon-actions', { url }, {
      url,
      offerInfo,
    });
  }

  // ------------------------------------------------------
  // Coupon activity detection
  // couponMsg is { type, couponValue, offerInfo }
  _onCouponActivity(couponMsg) {
    this.offersHandler.onCouponActivity(couponMsg, this._encodeCouponAction);
  }

  couponFormUsed(args) {
    return this._onCouponActivity(args);
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
   * @return {boolean} true if offers-checkout is shown, false otherwise
   */
  onDomReady(monitorCheck) {
    const { url, offerID: offerId, offerInfo } = monitorCheck;
    if (offerInfo) { this._publishDetectCouponActions(url, offerInfo); }

    const domain = extractHostname(url);
    const [ok, view, validOfferId] = this._popupNotification(offerId, domain, monitorCheck);
    if (!ok) { return false; }
    const offer = this.offersHandler.getOfferObject(validOfferId);

    if (!offer) { return false; }

    const { ui_info: { template_data: templateData = {} } = {} } = offer;
    if (Object.keys(templateData).length === 0) {
      logger.log('offer for offers-checkout with empty template_data: ', offer);
      return false;
    }
    this._publishPopupPushEvent({
      view,
      offerId: validOfferId,
      domain,
      offer,
      back: offerInfo,
      templateData,
      currentUrl: url,
    });
    return true;
  }

  _publishPopupPushEvent({
    back = {},
    currentUrl,
    domain,
    offer,
    offerId,
    templateData,
    view,
  }) {
    const { call_to_action: { url: ctaurl = '' } = {} } = templateData;
    const voucher = {
      benefit: templateData.benefit,
      code: templateData.code,
      conditions: templateData.conditions || '',
      ctaurl,
      headline: templateData.headline,
      landing: new Offer(offer).getMonitorPatterns(LANDING_MONITOR_TYPE),
      logo: templateData.logo_dataurl,
      logoClass: templateData.logo_class,
      offerId,
    };
    const { rule_info: { url = [] } = {} } = offer;
    const newUrl = url && url.length !== 0 ? url : currentUrl;
    const newBack = { ...back, url: currentUrl };
    const data = {
      back: newBack,
      display_rule: { url: newUrl },
      domain,
      view,
      voucher,
    };
    const payload = { dest: ['offers-checkout'], type: 'push-offer', data };
    events.pub('offers-send-ch', payload);
  }

  _popupNotification(offerId, domain, monitorCheck) {
    const { activate = false, offerInfo = {} } = monitorCheck;
    const activeIntent = activate && offerInfo.autoFillField;
    const paths = config.settings.OFFERS_BRAND !== 'chip'
      ? CHECKOUT_JOURNEYS
      : undefined; // using default value
    if (activeIntent) { this.checkoutReminder.add({ domain, offerId, paths }); }
    return this.checkoutReminder.notification(domain, activeIntent);
  }

  dispatcher(type, data) {
    const typeMapper = {
      log: this._log.bind(this),
      actions: this._receive.bind(this),
    };
    const noop = () => {};
    (typeMapper[type] || noop)(data);
  }

  _receive({ domain, action } = {}) {
    this.checkoutReminder.receive(domain, action);
  }

  _log({ back, action } = {}) {
    this._couponFormUsed({ url: back.url, offerInfo: back, couponValue: action });
    this._couponActivityActions(action, back.url, back);
  }

  _couponActivityActions(action, url, back) {
    const data = { type: 'popnot_pre_show', url, offerInfo: back };
    const mapper = {
      coupon_autofill_field_apply_action: () =>
        this._onCouponActivity({ ...data, type: action }),
      coupon_autofill_field_show: () =>
        this._onCouponActivity({ ...data, couponValue: true }),
      coupon_autofill_field_failed: () =>
        this._onCouponActivity({ ...data, couponValue: false }),
    };
    const noop = () => {};
    (mapper[action] || noop)();
  }
}
