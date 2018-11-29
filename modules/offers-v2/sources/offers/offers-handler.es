/**
 * @module offers-v2
 */
// Component description see the comment to `OffersHandler` class below

import MessageQueue from '../../core/message-queue';
import OffersGeneralStats from './offers-general-stats';
import logger from '../common/offers_v2_logger';
import OfferStatus from './offers-status';
import OffersAPI from './offers-api';
import OfferDBObserver from './offers-db-observer';
import IntentOffersHandler from './intent-offers-handler';
import OffersMonitorHandler from './offers-monitoring';
import IntentGatherer from './jobs/intent-gather';
import DBReplacer from './jobs/db-replacer';
import HardFilters from './jobs/hard-filters';
import SoftFilters from './jobs/soft-filters';
import ContextFilter from './jobs/context-filters';
import config from '../../core/config';
import ActionID from './actions-defs';
import OffersConfigs from '../offers_configs';
import Blacklist from './blacklist';
import chooseBestOffer from './best-offer';
import { OfferMatchTraits } from '../categories/category-match';


// /////////////////////////////////////////////////////////////////////////////
//                              Helper methods
// /////////////////////////////////////////////////////////////////////////////


/**
 * Utility function to execute a list of offers jobs on a given offers list
 * sequentially and gathering piping the result of one into the next one
 *
 * Returns the resulting offersList given by the last job
 */
const executeJobList = (jobList, offersList, ctx, idx = 0) => {
  if (!jobList || idx >= jobList.length) {
    return Promise.resolve(offersList);
  }
  const first = jobList[idx];
  return first.process(offersList, ctx).then(newResult =>
    executeJobList(jobList, newResult, ctx, idx + 1));
};

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
   * @param historyMatcher
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
    historyMatcher,
    featuresHandler,
    sigHandler,
    eventHandler,
    categoryHandler,
    offersDB,
  }) {
    this.intentHandler = intentHandler;
    this.offersDB = offersDB;
    this.offersDBObserver = new OfferDBObserver(this.offersDB);
    this.offersGeneralStats = new OffersGeneralStats(this.offersDB);
    this.offersMonitorHandler = new OffersMonitorHandler(sigHandler, this.offersDB, eventHandler);

    this.intentOffersHandler = new IntentOffersHandler(backendConnector, intentHandler);

    this.offersAPI = new OffersAPI(sigHandler, this.offersDB);

    this.sigHandler = sigHandler;

    this.blacklist = new Blacklist();
    this.blacklist.init();

    // manage the status changes here
    this.offerStatus = new OfferStatus();
    this.offerStatus.setStatusChangedCallback(this._updateOffersStatusCallback.bind(this));

    // we assume here that the offersDB is already loaded
    if (this.offersDB.dbLoaded) {
      this.offersGeneralStats.buildFromOffers(this.offersDB.getOffers({ includeRemoved: true }));
      this.offersDBObserver.observeExpirations();
    }

    this._offersDBCallback = this._offersDBCallback.bind(this);
    this.offersDB.registerCallback(this._offersDBCallback);

    // set the context we will use for each call
    const geoChecker = featuresHandler.isFeatureAvailable('geo')
      ? featuresHandler.getFeature('geo')
      : null;

    this.context = {
      presentRealEstates,
      geoChecker,
      historyMatcher,
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
    this.jobsPipeline = [
      new IntentGatherer(),
      new DBReplacer(),
      new HardFilters(),
      new ContextFilter(),
      new SoftFilters(),
    ];
  }

  async init() {
    return Promise.resolve(true);
  }

  destroy() {
    this.blacklist.unload();
    this.blacklist = null;
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

  getOfferObject(offerId) {
    return this.offersDB.getOfferObject(offerId);
  }

  getCampaignId(offerId) {
    return this.offersDB.getCampaignID(offerId);
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Protected methods

  isUrlBlacklisted(url) {
    return this.blacklist.has(url);
  }

  sendBlacklistSignal(campaignId, offerId) {
    const origin = 'processor';
    const actionId = 'global_offers_blacklist';
    this.sigHandler.setCampaignSignal(campaignId, offerId, origin, actionId);
    return this.offersDB.incOfferAction(offerId, actionId, false);
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Private methods

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
    const result = this.offersAPI.pushOffer(
      offer,
      displayRuleInfo,
      null, /* originID */
      new OfferMatchTraits(catMatches, offer.categories)
    );
    return Promise.resolve(result);
  }

  _updateOffers() {
    const next = this.intentOffersHandler.thereIsNewData()
      ? this.intentOffersHandler.updateIntentOffers()
      : Promise.resolve();

    const jobContext = { ...this.context, offersHandler: this };
    return next.then(() => executeJobList(this.jobsPipeline, [], jobContext));
  }

  /**
   * @param {UrlData} urlData
   * @param {CategoriesMatchTraits} catMatches
   */
  _processEvent({ urlData, catMatches }) {
    logger.debug('Offers handler processing a new event', urlData.getRawUrl());

    if (!shouldWeShowAnyOffer(this.offersGeneralStats)) {
      logger.debug('we should not show any offer now');
      return Promise.resolve(false);
    }
    this.context.urlData = urlData;

    return this
      ._updateOffers()
      .then(offers =>
        this._chooseBestOffer(offers, urlData, catMatches));
  }

  _chooseBestOffer(offers, urlData, catMatches) {
    logger.debug(`We have ${offers.length} on the queue`);
    if (!offers.length) {
      return Promise.resolve(false);
    }
    const getOfferDisplayCount = o => this.offersDB.getDisplayCount(o.uniqueID);

    const [topOffer, score] = chooseBestOffer(offers, catMatches, getOfferDisplayCount);
    if (!(topOffer && score)) {
      return Promise.resolve(false);
    }
    logger.debug(`Offer selected with score ${score}:`, topOffer);

    return this._pushOffersToRealEstates(topOffer, urlData, catMatches);
  }

  _offersDBCallback(message) {
    if (message.evt === 'offer-action') {
      this.offersGeneralStats.newOfferAction(message);
    } else if (message.evt === 'offers-db-loaded') {
      const allOffersMeta = this.offersDB.getOffers({ includeRemoved: true });
      this.offersGeneralStats.buildFromOffers(allOffersMeta);
      this.offersDBObserver.observeExpirations();
    } else if (message.evt === 'offer-added') {
      // we will add the action to the offer to keep track of it
      const offerID = message.offer.offer_id;
      this.offersDB.incOfferAction(offerID, ActionID.AID_OFFER_DB_ADDED);
    } else if (message.evt === 'offer-removed') {
      const offerID = message.offer.offer_id;
      const campaignID = message.offer.campaign_id;
      const erased = message.extraData && message.extraData.erased === true;
      this.offersAPI.offerRemoved(offerID, campaignID, erased);
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
}
