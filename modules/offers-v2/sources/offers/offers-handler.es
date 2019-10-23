/**
 * @module offers-v2
 */
// Component description see the comment to `OffersHandler` class below

import MessageQueue from '../../core/message-queue';
import md5 from '../../core/helpers/md5';
import events from '../../core/events';
import prefs from '../../core/prefs';
import config from '../../core/config';
import { isGhostery } from '../../core/platform';
import OffersConfigs from '../offers_configs';
import logger from '../common/offers_v2_logger';

import OffersGeneralStats from './offers-general-stats';
import OfferStatus from './offers-status';
import OffersAPI from './offers-api';
import OfferDBObserver from './offers-db-observer';
import Offer from './offer';
import IntentOffersHandler from './intent-offers-handler';
import OffersMonitorHandler from './offers-monitoring';
import ActionID from './actions-defs';
import Blacklist from './blacklist';
import OffersToPageRelationStats from './relation-stats/offers-to-page';
import { mock as mockOffersToPageRelationStats } from './relation-stats/offers-to-page-utils';
import chooseBestOffer from './best-offer';
import { OfferMatchTraits } from '../categories/category-match';
import { ImageDownloaderForPush } from './image-downloader';
import { getDynamicContent } from './dynamic-offer';

import IntentGatherer from './jobs/intent-gather';
import DBReplacer from './jobs/db-replacer';
import HardFilters from './jobs/hard-filters';
import SoftFilters from './jobs/soft-filters';
import ContextFilter from './jobs/context-filters';
import ThrottlePushToRewardsFilter from './jobs/throttle';
import ShuffleFilter from './jobs/shuffle';

const REWARD_BOX_REAL_ESTATE_TYPE = 'offers-cc';

// /////////////////////////////////////////////////////////////////////////////
//                              Helper methods
// /////////////////////////////////////////////////////////////////////////////


/**
 * Utility function to execute a list of offers jobs on a given offers list
 * sequentially and gathering piping the result of one into the next one
 *
 * Returns the resulting offersList given by the last job
 */
async function executeJobList(jobList, ctx) {
  let offers = [];
  const sizes = [];
  for (const job of jobList) {
    offers = await job.process(offers, ctx); // eslint-disable-line no-await-in-loop
    sizes.push(offers.length);
  }
  logger.debug(`Number of offers for job steps: ${sizes.join('/')}`);
  return offers;
}

/**
 * This method will check global things like total amount of offers per day,
 * number of offers per hour, etc.
 */
const shouldWeShowAnyOffer = offersGeneralStats =>
  config.settings.channel === '99'
    || (offersGeneralStats.offersAddedToday() < OffersConfigs.MAX_NUM_OFFERS_PER_DAY);

// /////////////////////////////////////////////////////////////////////////////
/**
 * This file is the entry point for the "offers" module.
 *
 * This class will be in charge of given an user event (url change), take all
 * the active intents, all the associated offers for it and decide which should
 * be the offer that we should send to the real estate.
 * This class will depend on:
 *
 * - intent system (to know which intents are active + get the associated offers).
 * - "offers-api" to be able to distribute the offers to the real estates
 * - "offers_db" to access the data of the offers that had been shown and the
 *   associated signals (actions).
 * - signals handler to delivery the interesting signals.
 *
 * The goal is to "handle" all the other sub classes and coordinate the flow of
 * the offers:
 *
 * - get all the active offers (for the active intents)
 * - prioritize them based in some heuristic.
 * - filter the offers that doesnt met any criteria
 * - handle the monitoring of the current offers (store and monitoring)
 * - broadcast to all the real estates when needed
 * - receive signals from real estates and store the data
 *
 * @class OffersHandler
 */
export default class OffersHandler {
  /**
   * @constructor
   * @param intentHandler
   * @param backendConnector
   * @param presentRealEstates
   * @param featuresHandler
   * @param sigHandler
   * @param eventHandler
   * @param categoryHandler
   * @param offersDB
   */
  constructor({
    intentHandler,
    backendConnector,
    presentRealEstates,
    featuresHandler,
    sigHandler,
    eventHandler,
    categoryHandler,
    offersDB,
    chipdeHandler,
    offersImageDownloader = new ImageDownloaderForPush(),
  }) {
    this.intentHandler = intentHandler;
    this.offersDB = offersDB;
    this.offersImageDownloader = offersImageDownloader;
    this.offersDBObserver = new OfferDBObserver(this.offersDB);
    this.offersGeneralStats = new OffersGeneralStats(this.offersDB);
    this.offersMonitorHandler = new OffersMonitorHandler(sigHandler, this.offersDB, eventHandler);

    this.intentOffersHandler = new IntentOffersHandler(backendConnector, intentHandler);

    this.offersAPI = new OffersAPI(sigHandler, this.offersDB, backendConnector);

    this.sigHandler = sigHandler;

    this.blacklist = new Blacklist();
    this.blacklist.init();

    this.offersToPageRelationStats = isGhostery
      ? mockOffersToPageRelationStats()
      : new OffersToPageRelationStats();

    // manage the status changes here
    this.offerStatus = new OfferStatus();
    this.offerStatus.setStatusChangedCallback(this._updateOffersStatusCallback.bind(this));

    this.offersGeneralStats.buildFromOffers(this.offersDB.getOffers({ includeRemoved: true }));
    this.offersDBObserver.observeExpirations();

    this._offersDBCallback = this._offersDBCallback.bind(this);
    this.offersDB.registerCallback(this._offersDBCallback);

    // set the context we will use for each call
    const geoChecker = featuresHandler.isFeatureAvailable('geo')
      ? featuresHandler.getFeature('geo')
      : null;

    this.context = {
      presentRealEstates,
      geoChecker,
      offersDB: this.offersDB,
      categoryHandler,
      intentHandler,
      intentOffersHandler: this.intentOffersHandler,
    };

    // process event method
    this._processEvent = this._processEvent.bind(this);
    this.evtQueue = new MessageQueue('offers-handler-queue', this._processEvent);

    // we build the process pipeline here that will basically produce the list
    // of prioritized offers
    this.throttlePushRewardsBoxFilter = new ThrottlePushToRewardsFilter();
    this.jobsPipeline = [
      new IntentGatherer(),
      new DBReplacer(),
      new HardFilters(),
      this.throttlePushRewardsBoxFilter,
      new ContextFilter(),
      new SoftFilters(),
      ShuffleFilter, // for competing offers, avoid first-offer-from-backend bias
    ];
    if (chipdeHandler) {
      // Add after `DBReplacer`, so that offers in `OffersDB` can be
      // updated to new versions from the backend.
      this.jobsPipeline.splice(2, 0, chipdeHandler.getOffersJobFilter());
    }

    this.nEventsProcessed = 0; // Used as a wait marker by tests
  }

  async init() {
    this.throttlePushRewardsBoxFilter.init();
    return Promise.resolve(true);
  }

  destroy() {
    this.throttlePushRewardsBoxFilter.unload();
    this.blacklist.unload();
    this.blacklist = null;
    this.offersToPageRelationStats = null;
    this.offersDB.unregisterCallback(this._offersDBCallback);
    this.offersDBObserver.unload();
    // TODO: unregister intent handler callback?
  }

  /**
   * Entry point to handle an URL change. Called after the trigger
   * machine executor, after it matched the URL against the triggers.
   *
   * @method urlChangeEvent
   * @param {UrlData} urlData
   * @param {CategoriesMatchTraits} catMatches
   */
  urlChangedEvent(urlData, catMatches) {
    return this.evtQueue.push({ urlData, catMatches });
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Bridge methods

  shouldActivateOfferForUrl(urlData) {
    return this.offersMonitorHandler.shouldActivateOfferForUrl(urlData);
  }

  couponFormUsed(args) {
    this.offersMonitorHandler.couponFormUsed(args);
  }

  onCouponActivity(couponMsg, serializer) {
    this.offersMonitorHandler.addCouponSignal(couponMsg, serializer);
  }

  getOfferObject(offerId) {
    return this.offersDB.getOfferObject(offerId);
  }

  getCampaignId(offerId) {
    return this.offersDB.getCampaignID(offerId);
  }

  markOffersAsRead() {
    const offers = isGhostery
      ? []
      : this.offersDB.getOffersByRealEstate(REWARD_BOX_REAL_ESTATE_TYPE);
    const [counter, action] = [1, 'offer_read'];
    offers.forEach(({ offer }) => this.offersDB.incOfferAction(offer.offer_id, action, counter));
    this.offersToPageRelationStats.invalidateCache();
  }

  getStoredOffersWithMarkRelevant(filters, { catMatches, urlData } = {}) {
    if (!this.offersAPI) { return []; }
    const offers = this.offersAPI.getStoredOffers(filters);
    if (!urlData || !catMatches) { return offers; }
    const offersForStats = isGhostery
      ? []
      : this.offersDB.getOffersByRealEstate(REWARD_BOX_REAL_ESTATE_TYPE);
    const stats = this.offersToPageRelationStats.stats(offersForStats, catMatches, urlData);
    const relevant = stats.related.concat(stats.owned);
    return offers.map(o => ({ ...o, relevant: relevant.includes(o.offer_id) }));
  }

  updateIntentOffers() {
    return this.intentOffersHandler.updateIntentOffers();
  }

  getOffersForIntent(intentName) {
    return this.intentOffersHandler.getOffersForIntent(intentName);
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Protected methods

  isUrlBlacklisted(url) {
    return this.blacklist.has(url);
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Private methods

  /**
   * Notify backend that an event was filtered out.
   * Called from the filters, passed to the filters as a callback.
   *
   * @param {Offer} offer
   * @param {string} filterId
   *   Something like 'filtered_by_compete' or 'filter_exp__...'
   */
  _onOfferIsFilteredOut(offer, filterId) {
    this.sigHandler.setCampaignSignal(
      offer.campaignID,
      offer.uniqueID,
      'processor',
      filterId,
      1 // counter
    );
  }

  /**
   * this method will be called whenever an offer is accepted to be sent to the
   * real estate
   */
  _pushOffersToRealEstates(offer, urlData, catMatches) {
    const displayRuleInfo = {
      type: 'exact_match',
      url: [urlData.getRawUrl()],
      display_time_secs: offer.ruleInfo.display_time_secs,
    };
    const domainHash = md5(urlData.getDomain() || '');
    const result = this.offersAPI.pushOffer(
      offer,
      displayRuleInfo,
      null, /* originID */
      new OfferMatchTraits(catMatches, offer.categories, domainHash)
    );
    return Promise.resolve(result);
  }

  _updateOffers() {
    const next = this.intentOffersHandler.thereIsNewData()
      ? this.intentOffersHandler.updateIntentOffers()
      : Promise.resolve([]);

    const jobContext = {
      ...this.context,
      offersHandler: this,
      offerIsFilteredOutCb: this._onOfferIsFilteredOut.bind(this)
    };
    return next.then(() => executeJobList(this.jobsPipeline, jobContext));
  }

  /**
   * @param {UrlData} urlData
   * @param {CategoriesMatchTraits} catMatches
   */
  async _processEvent(evt) {
    const ret = await this._processEventWrapped(evt);
    this.nEventsProcessed += 1;
    return ret;
  }

  async _processEventWrapped({ urlData, catMatches }) {
    const unreminderedOfferId = this._notifyAboutUnreadOffers(catMatches, urlData);
    const wasChosen = await this._chooseBestOfferIfCan(catMatches, urlData);
    if (!wasChosen && unreminderedOfferId) {
      this._showTooltip(unreminderedOfferId, urlData);
    }
    return wasChosen;
  }

  async _chooseBestOfferIfCan(catMatches, urlData) {
    logger.debug('Offers handler processing a new event', urlData.getRawUrl());

    if (!shouldWeShowAnyOffer(this.offersGeneralStats)) {
      logger.debug('we should not show any offer now');
      return false;
    }
    this.context.urlData = urlData;

    const offers = await this._updateOffers();
    if (!offers) {
      return false;
    }
    let bestOffer = this._chooseBestOffer(offers, urlData, catMatches);
    if (!bestOffer) {
      return false;
    }
    if (prefs.get('dynamic-offers.enabled', false)) {
      bestOffer = await getDynamicContent(bestOffer, urlData, catMatches);
    }
    await this._preloadImages(bestOffer);
    await this._pushOffersToRealEstates(bestOffer, urlData, catMatches);
    return true;
  }

  // sync
  _chooseBestOffer(offers, urlData, catMatches) {
    //
    // Prepare calculations
    //
    if (!offers.length) {
      return false;
    }
    const getOfferDisplayCount = o => this.offersDB.getPushCount(o.uniqueID);

    //
    // Make the choice
    //
    const [bestOffer, score] = chooseBestOffer(offers, catMatches, getOfferDisplayCount);
    if (!(bestOffer && score)) {
      return false;
    }
    logger.debug(`Offer selected with score ${score}:`, bestOffer.uniqueID);
    //
    // Notify backend
    //
    offers.forEach((offer) => {
      if (offer !== bestOffer) {
        this._onOfferIsFilteredOut(offer, ActionID.AID_OFFER_FILTERED_COMPETE);
      }
    });
    return bestOffer;
  }

  //
  // Two side effects at once:
  //
  // - The callback with `setSmthDataurl` can be called twice.
  //   It happens if an image is successfully downloaded after timeout.
  //
  // - If the offer is already in `OffersDB`, then `offer` is an object
  //   from the database.
  //   Therefore, `setSmthDataurl` changes the content of `OffersDB`.
  //
  async _preloadImages(offer) {
    const logo = this.offersImageDownloader.downloadWithinTimeLimit(
      offer.getLogoUrl(),
      offer.getLogoDataurl(),
      dataurl => offer.setLogoDataurl(dataurl),
    );
    const picture = this.offersImageDownloader.downloadWithinTimeLimit(
      offer.getPictureUrl(),
      offer.getPictureDataurl(),
      dataurl => offer.setPictureDataurl(dataurl),
    );

    await Promise.all([logo, picture]);
  }

  _offersDBCallback(message) {
    if (message.evt === 'offer-action') {
      this.offersGeneralStats.newOfferAction(message);
      this.offersToPageRelationStats.invalidateCache();
    } else if (message.evt === 'offer-added') {
      // we will add the action to the offer to keep track of it
      const offerID = message.offer.offer_id;
      this.offersDB.incOfferAction(offerID, ActionID.AID_OFFER_DB_ADDED);
      this.offersToPageRelationStats.invalidateCache();
    } else if (message.evt === 'offer-removed') {
      const offerID = message.offer.offer_id;
      const campaignID = message.offer.campaign_id;
      const erased = message.extraData && message.extraData.erased === true;
      this.offersAPI.offerRemoved(offerID, campaignID, erased);
      this.offersToPageRelationStats.invalidateCache();
    }
  }

  /**
   * This method will update all the current offers we have on the DB and remove
   * the ones that are obsolete using the offers-status.
   * @return {[type]} [description]
   */
  _updateOffersStatusCallback() {
    const isOfferObsolete = offerID => this.offerStatus.getOfferStatus(offerID) === 'obsolete';

    const rawOffers = this.offersDB.getOffers();
    rawOffers.forEach((offerElement) => {
      // EX-5923: we will need to remove all the offers that are obsolete
      if (isOfferObsolete(offerElement.offer_id)) {
        // remove this from the database without emitting any signal
        this.offersDB.removeOfferObject(offerElement.offer_id);
      }
    });
  }

  _notifyAboutUnreadOffers(catMatches, urlData) {
    const offers = isGhostery
      ? []
      : this.offersDB.getOffersByRealEstate(REWARD_BOX_REAL_ESTATE_TYPE);
    const stats = this.offersToPageRelationStats.statsCached(offers, catMatches, urlData);

    const relevant = Array.from(new Set(stats.related.concat(stats.owned)));
    const untouched = relevant.filter(oid => !stats.touched.includes(oid));
    if (untouched.length === 0) { return undefined; }

    // (untouched & related) - tooltip - owned
    const notRemindered = untouched.filter(
      oid => stats.related.includes(oid)
        && !stats.owned.includes(oid)
        && !stats.tooltip.includes(oid)
    );
    if (notRemindered.length !== 0) { return notRemindered.pop(); } // just last offerId

    this._notifyUnreadCounts(urlData, untouched.length);
    return undefined;
  }

  _notifyUnreadCounts(urlData, count) {
    const tabId = urlData.getTabId();
    if (count) { events.pub('offers-notification:unread-offers-count', { count, tabId }); }
  }

  _showTooltip(offerId, urlData) {
    const offer = this.getOfferObject(offerId);
    if (!offer) { return; }
    const { ui_info: uiInfo = {} } = offer;
    const newuiInfo = { ...uiInfo, notif_type: 'tooltip' };
    this.offersAPI.pushOffer(
      new Offer({ ...offer, ui_info: newuiInfo }),
      { url: [urlData.getRawUrl()] } // displayRuleInfo
    );
  }
}
