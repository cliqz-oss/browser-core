/**
 *
 * This file contains the wrapper of what an offer is providing some accessors
 * methods and also building the proper structures when required.
 * Defines also what are the required fields of an offer.
 *
 */
import logger from '../common/offers_v2_logger';
import jsep from '../../platform/lib/jsep';
import { buildSimplePatternIndex } from '../common/pattern-utils';

// /////////////////////////////////////////////////////////////////////////////
//                            Helper methods

/**
 * the expected geo data is a object: { country -> { city -> [postal1, ...] }};
 * @returns a map with the same information
 */
const buildGeoMap = (geoData) => {
  const result = new Map();
  Object.keys(geoData).forEach((countryName) => {
    result.set(countryName, new Map());
    Object.keys(geoData[countryName]).forEach((cityName) => {
      result.get(countryName).set(cityName, new Set(geoData[countryName][cityName] || []));
    });
  });
  return result;
};

/**
 * The expected structure of a backend offer:
 * <pre>
 * {
 *   // [required] the unique tracking id for the offer
 *   offer_id: XYZ,
 *
 *   // [required] the associated campaign id of the offer
 *   campaign_id: XYZ,
 *
 *   // [required] the display id of the offer, basically will be used to consider different
 *   // offer objects as the same, in the current moment writing this documentation,
 *   // all offers of the same campaign should have the same display id.
 *   display_id: XYZ,
 *
 *   // [optional] the associated client offer id
 *   client_id: XYZ,
 *
 *   // [optional] the associated tags (offer types). This will be used to get
 *   // later associated offers of the same type and check if any of them were
 *   // shown or anything so we can apply filters on it using this data.
 *   types: ['offer_type1', 'offer_type2',..]
 *
 *   // [required] the real estates where this offer can be shown.
 *   rs_dest: [...],
 *
 *   // [optional] version: if we need to update the offer from the db because
 *   // something has changed like the monitor or something, we can do this
 *   // using a different version id (for now will be a hash).
 *   version: 'hash id here',
 *
 *   // [required] monitoring information for the particular offer.
 *   //  The monitoring data will be a list of the following elements:
 *   //
 *   //   {
 *   //     offerID: the unique offer id identifying the offer, (automatically set on frontend)
 *   //     signalID: the signal we want to send when activating the monitor,
 *   //     type: can be either 'webrequest' or 'urlchange' or coupon type,
 *   //
 *   //     // this is required if type === 'webrequest'
 *   //     domain: XYZ, // where we will watch the requests
 *   //
 *   //     // params are optional
 *   //     params: {
 *   //       // will be used to store the url where the signal will be sent getting it
 *   //       // from the context (current url). If the store is true and the url is on
 *   //       // the DB then we will change the signal name to repeated_ + signal_name.
 *   //       // On store == true we will also store the current url if not added before
 *   //       // If store == false we will not do anything described above.
 *   //       // Note that if the monitor contains multiple patterns (different urls),
 *   //       // the 'repeated_' prefix will be added per pattern, meaning that if
 *   //       // p1, p2, are patterns for signal 's1', the user visiting p1 will
 *   //       // trigger 's1', user visiting p2 will trigger again 's1' and if the user
 *   //       // visit now either p1 or p2 then will trigger 'repeated_s1'.
 *   //       store: true / false,
 *   //
 *   //       // this parameter will be used (if present) to check when was the last signal
 *   //       // with the same name for the same campaign associated, and if exists we will
 *   //       // check the delta time from now to the last time we sent this signal.
 *   //       // in that case we will filter every signal that happened in that period of time
 *   //       // (now - last_signal_ts).
 *   //       // if this field is null or <= 0 nothing will be checked / filtered.
 *   //       filter_last_secs: N,
 *   //
 *   //       // should we include the referrer category?
 *   //       referrer_cat: true / false,
 *   //     },
 *   //     patterns: ["adblocker pattern"]
 *   //     // if the type == 'coupon' we will have this additional information:
 *   //     couponInfo: {
 *   //       code: (THIS WILL BE AUTOMATICALLY SET ON THE EXTENSION, taking it from the offer)
 *   //       autoFillField: true | false // saying if we should autofill or not the field
 *   //     }
 *   //   }
 *   //
 *   monitorData: [{...}, {...}, ...]
 *
 *   // [required] ui information that will be basically used on the real estate
 *   ui_info: {...},
 *
 *   // [optional] geolocation data, if the offer should be only shown in particular
 *   // cities or places.
 *   // The geo object will look like:
 *   geo: { country -> { city -> [postal1, ...] }},
 *
 *   // [optional?] the display priority we will use to sort the offers in the
 *   // case we have multiple of them. If no present then 0 will be set?
 *   displayPriority: N,
 *
 *   // [optional] The abtest information in case that this offer belongs to
 *   // an ab test group. It will belong to the group [start, end]
 *   abTestInfo: {
 *     start: N,
 *     end: M,
 *   }
 *
 *   // [optional] If we have a blacklist of domains where we do not should show
 *   // the offer. If no blacklist we will show the offer in every site.
 *   blackListPatterns: [...],
 *
 *   // [optional] Filter rules? we still need this? if so we maybe can return
 *   // directly from here instead of fetching it from the backend.
 *   rule_info: {...},
 *
 *   // [optional] The string containing the filtering rules encoded in jsep format.
 *   filterRules: {
 *     eval_expression: "expression here",
 *   },
 *
 *   // [optional] the expiration time in ms, is a delta value meaning from the time
 *   // the user gets the offer when will be invalidated, basiically will be valid if
 *   // now < offerCreatedTsMs + expirationMs
 *   // This value comes from the backend and will be used to calculate the validUntilTs
 *   expirationMs: deltaMs,
 *
 *   // [optional] the list of categories defined here will be used to filter the
 *   // offer if some of the categories is not active. We will check if any of
 *   // the categories on the list is active
 *   categories: ['cat1', 'cat2',...],
 *
 * }
 * </pre>
 *
 * @class BackendOffer
 */

/**
 * The wrapper of an offer object from the backend.
 * Will provide some easy access functions.
 * See also {{#crossLink "BackendOffer"}}{{/crossLink}}
 *
 * @class Offer
 */
export default class Offer {
  /**
   * @constructor
   * @param {BackendOffer} offerObj
   */
  constructor(offerObj) {
    this.offerObj = offerObj;
    // cache for this object
    this._geo = null;
    this._filterRules = null;
    this._blackListPatterns = null;
    this._hasDynamicContent = false;
  }

  isValid() {
    // TODO: take into account that client_id should be added to all the
    // new offers including dropdown
    return !!(this.offerObj
           && this.offerObj.offer_id
           && this.offerObj.campaign_id
           && this.offerObj.display_id
           && this.offerObj.ui_info
           && this.offerObj.monitorData);
  }

  get ABTestInfo() {
    return this.offerObj.abTestInfo;
  }

  get destinationRealEstates() {
    return this.offerObj.rs_dest || [];
  }

  get version() {
    return this.offerObj.version === undefined ? '' : this.offerObj.version;
  }

  get monitorData() {
    return this.offerObj.monitorData;
  }

  get uiInfo() {
    return this.offerObj.ui_info;
  }

  isGeoLocated() {
    return !!this.offerObj.geo;
  }

  get geoInfo() {
    if (this._geo === null && this.isGeoLocated()) {
      this._geo = buildGeoMap(this.offerObj.geo);
    }
    return this._geo;
  }

  get displayPriority() {
    return this.offerObj.displayPriority !== undefined
      ? this.offerObj.displayPriority
      : 0.0;
  }

  hasBlacklistPatterns() {
    return !!this.offerObj.blackListPatterns;
  }

  get blackListPatterns() {
    if (this._blackListPatterns === null && this.hasBlacklistPatterns()) {
      this._blackListPatterns = buildSimplePatternIndex(this.offerObj.blackListPatterns);
    }
    return this._blackListPatterns;
  }

  get displayID() {
    return this.offerObj.display_id;
  }

  get clientID() {
    return this.offerObj.client_id;
  }

  /**
   * For reference, in the past we have offer_id as unique offer id
   */
  get uniqueID() {
    return this.offerObj.offer_id;
  }

  get campaignID() {
    return this.offerObj.campaign_id;
  }

  hasFilterRules() {
    return (!!this.offerObj.filterRules) && (this.offerObj.filterRules.eval_expression !== '');
  }

  /**
   * will return the associated filtered rules (compiled ones)
   */
  get filterRules() {
    if (this._filterRules === null && this.hasFilterRules()) {
      try {
        this._filterRules = jsep(this.offerObj.filterRules.eval_expression);
      } catch (e) {
        logger.error('jsep couldn\'t parse:', e);
      }
    }
    return this._filterRules;
  }

  /**
   * Probably we should deprecate this and think in another way
   */
  get ruleInfo() {
    return this.offerObj.rule_info
      ? this.offerObj.rule_info
      : { rule_info: { display_time_secs: 999999, type: 'exact_match', url: [] } };
  }

  hasExpirationMs() {
    return !!this.offerObj.expirationMs;
  }

  get expirationMs() {
    return this.offerObj.expirationMs;
  }

  hasCategories() {
    return this.offerObj.categories && this.offerObj.categories.length > 0;
  }

  get categories() {
    return this.offerObj.categories;
  }

  isTargeted() {
    return Boolean(this.offerObj.targeted);
  }

  shouldShowDynamicOffer() {
    return this.offerObj.show_dynamic_offer || true;
  }

  hasDynamicContent() {
    return this._hasDynamicContent;
  }

  /**
   * The offer's reward will be based on eCPM (effective cost per mille).
   * At the moment, it is based on manually set display priority.
   * If the display priority is not set, return 1.
   *
   * Exact values are not important because they are normalized during
   * calculations. Important are the proportions between the values.
   *
   * @method getReward
   * @returns {number} Positive value
   */
  getReward() {
    const reward = this.displayPriority;
    return (reward || 0) <= 0 ? 1.0 : reward;
  }

  getLogoUrl() {
    return this.offerObj.ui_info.template_data.logo_url;
  }

  getLogoDataurl() {
    return this.offerObj.ui_info.template_data.logo_dataurl;
  }

  setLogoDataurl(dataurl) {
    this.offerObj.ui_info.template_data.logo_dataurl = dataurl;
  }

  getPictureUrl() {
    return this.offerObj.ui_info.template_data.picture_url;
  }

  getPictureDataurl() {
    return this.offerObj.ui_info.template_data.picture_dataurl;
  }

  setPictureDataurl(dataurl) {
    this.offerObj.ui_info.template_data.picture_dataurl = dataurl;
  }

  setDynamicContent(productPictureUrl, productCtaUrl) {
    this.offerObj.ui_info.template_data.picture_url = productPictureUrl;
    this.offerObj.ui_info.template_data.picture_dataurl = undefined;
    this.offerObj.ui_info.template_data.call_to_action.url = productCtaUrl;
    this._hasDynamicContent = true;
  }
}
