/**
 * This file is the entry point for the "offers" module.
 *
 * This class will be in charge of given an user event (url change), take all
 * the active intents, all the associated offers for it and decide which should
 * be the offer that we should send to the real estate.
 * This class will depend on:
 * - intent system (to know which intents are active + get the associated offers).
 * - "offers-api" to be able to distribute the offers to the real estates
 * - "offers_db" to access the data of the offers that had been shown and the
 *   associated signals (actions).
 * - signals handler to delivery the interesting signals.
 *
 * The goal is to "handle" all the other sub classes and coordinate the flow of
 * the offers:
 * - get all the active offers (for the active intents)
 * - prioritize them based in some heuristic.
 * - filter the offers that doesnt met any criteria
 * - handle the monitoring of the current offers (store and monitoring)
 * - broadcast to all the real estates when needed
 * - receive signals from real estates and store the data
 *
 * Check https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/66191480/General+Architecture+offers-v2.1
 * for more information
 */

import MessageQueue from '../../core/message-queue';
import OffersGeneralStats from './offers-general-stats';
import logger from '../common/offers_v2_logger';
import OfferStatus from './offers-status';
import OffersAPI from './offers-api';
import OfferDB from './offers-db';
import OfferDBObserver from './offers-db-observer';
import IntentOffersHandler from './intent-offers-handler';
import shouldFilterOffer from './soft-filter';
import OffersMonitorHandler from './offers-monitoring';
import IntentGatherer from './jobs/intent-gather';
import DBReplacer from './jobs/db-replacer';
import HardFilters from './jobs/hard-filters';
import Prioritizer from './jobs/prioritizer';
import ContextFilter from './jobs/context-filters';
import prefs from '../../core/prefs';
import { getLatestOfferInstallTs, timestampMS } from '../utils';
import ActionID from './actions-defs';


// /////////////////////////////////////////////////////////////////////////////
//                              Constants
// /////////////////////////////////////////////////////////////////////////////
const MAX_NUM_OFFERS_PER_DAY = 5;
// time in secs that we will use to consider offers fresh install
const FRESH_INSTALL_THRESHOLD_SECS = 45 * 60; // 45 mins?

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
  // TODO: remove this log
  logger.debug(`Executing job ${first.name}`);
  return first.process(offersList, ctx).then(newResult =>
    executeJobList(jobList, newResult, ctx, idx + 1)
  );
};

/**
 * Will check if the user just installed or not the extension, this will
 * be used to avoid showing offers if thats the case, except it is development
 */
const isFreshInstalled = () => {
  if (prefs.get('offersDevFlag', false)) {
    return false;
  }

  // check the installed timestamp
  const timeSinceInstallSecs = (timestampMS() - getLatestOfferInstallTs()) / 1000;
  return timeSinceInstallSecs < FRESH_INSTALL_THRESHOLD_SECS;
};


/**
 * This method will check global things like total amount of offers per day,
 * number of offers per hour, etc.
 */
const shouldWeShowAnyOffer = offersGeneralStats =>
  // is not just fresh installed
  !isFreshInstalled() &&
  // check that we didnt reached the max num of offers per day
  offersGeneralStats.offersAddedToday() < MAX_NUM_OFFERS_PER_DAY;


/**
 * This method will check if the current offer should be shown or not on the current
 * url context ({ urlData })
 */
const shouldShowOfferOnContext = (offer, { urlData }) => {
  // TODO: add maybe here the global patterns (pages that we do not want to show
  // at all, maybe will be a little complicated to do this)
  const isInBlacklist = () => offer.hasBlacklistPatterns() &&
                              offer.blackListPatterns.match(urlData.getPatternRequest());

  return !isInBlacklist();
};


// /////////////////////////////////////////////////////////////////////////////
export default class OffersHandler {
  constructor({
    intentHandler,
    backendConnector,
    presentRealEstates,
    historyMatcher,
    featuresHandler,
    sigHandler,
    eventHandler,
    categoryHandler,
    db,
  }) {
    this.intentHandler = intentHandler;
    this.offersDB = new OfferDB(db);
    this.offersDBObserver = new OfferDBObserver(this.offersDB);
    this.offersGeneralStats = new OffersGeneralStats(this.offersDB);
    this.offersMonitorHandler = new OffersMonitorHandler(sigHandler, this.offersDB, eventHandler);

    this.intentOffersHandler = new IntentOffersHandler(backendConnector, intentHandler);

    this.offersAPI = new OffersAPI(sigHandler, this.offersDB);

    this.sigHandler = sigHandler;

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
    const geoChecker = featuresHandler.isFeatureAvailable('geo') ?
      featuresHandler.getFeature('geo') :
      null;
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
      new Prioritizer(),
      new ContextFilter(),
    ];

    this.lastTimeProcessedAllJobs = null;

    // this will be latest prioritized offers list we have
    this.prioritizedOffers = [];
  }

  destroy() {
    this.offersDB.unregisterCallback(this._offersDBCallback);
    this.offersDBObserver.unload();
    // TODO: unregister intent handler callback?
  }

  urlChangedEvent(urlData) {
    // we add the event to be processed on the queue
    return this.evtQueue.push({ urlData });
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Bridge methods

  shouldActivateOfferForUrl(urlData) {
    return this.offersMonitorHandler.shouldActivateOfferForUrl(urlData);
  }

  couponFormUsed(args) {
    this.offersMonitorHandler.couponFormUsed(args);
  }


  // ///////////////////////////////////////////////////////////////////////////
  // Private methods
  // ///////////////////////////////////////////////////////////////////////////

  /**
   * this method will be called whenever an offer is accepted to be sent to the
   * real estate
   */
  _pushOffersToRealEstates(offer, urlData) {
    // send the offer to the offers api
    const displayRuleInfo = {
      type: 'exact_match',
      url: [urlData.getRawUrl()],
      display_time_secs: offer.ruleInfo.display_time_secs,
    };
    const result = this.offersAPI.pushOffer(offer, displayRuleInfo);
    return Promise.resolve(result);
  }

  _updateOffersIfNeeded() {
    const processJobs = () => executeJobList(this.jobsPipeline, [], this.context)
      .then((pOffers) => {
        this.prioritizedOffers = pOffers;
        return Promise.resolve(true);
      });

    if (this.intentOffersHandler.thereIsNewData()) {
      logger.debug('We have new offers intent data that should be processed');
      // fetch the offers and execute all the pipeline again
      return this.intentOffersHandler.updateIntentOffers().then(() => processJobs());
    }

    // check if we just need to recalculate the list
    if (this._shouldProcessAllJobs()) {
      return processJobs();
    }

    return Promise.resolve(true);
  }

  _processEvent({ urlData }) {
    logger.debug('Offers handler processing a new event', urlData.getRawUrl());
    // first of all we check the main global filters that are fixed and not
    // associated to any offer itself
    if (!shouldWeShowAnyOffer(this.offersGeneralStats)) {
      logger.debug('we should not show any offer now');
      // avoid showing offers for now
      return Promise.resolve(false);
    }

    // set the current context data
    this.context.urlData = urlData;

    // get the current prioritized offers
    return this._updateOffersIfNeeded().then(() => {
      logger.debug(`We have ${this.prioritizedOffers.length} on the queue`);

      // we need to pick the best offer here, for that what we do is basically
      // - get the top offer
      // - check if we should filter
      //   - if we should -> proceed to the next and repeat
      //   - if we do not filter it out we just push it to offers-api and end
      let topOffer = null;
      while (topOffer === null && this.prioritizedOffers.length > 0) {
        const highPriorityOffer = this.prioritizedOffers[this.prioritizedOffers.length - 1];
        if (shouldFilterOffer(highPriorityOffer, this.offersDB)) {
          logger.debug(`Offer ${highPriorityOffer.uniqueID} soft-filtered out!`, highPriorityOffer);
          this.prioritizedOffers.pop();
        } else {
          topOffer = highPriorityOffer;
        }
      }

      logger.debug('Offers selected: ', topOffer);

      if (!topOffer) {
        // no offer to be shown
        return Promise.resolve(true);
      }

      // now the latest check is if we should show it in the current context
      // or not
      if (!shouldShowOfferOnContext(topOffer, { urlData })) {
        return Promise.resolve(true);
      }

      // we should show it here
      return this._pushOffersToRealEstates(topOffer, urlData);
    });
  }

  _shouldProcessAllJobs() {
    // for now we will process all jobs all the time on every url change
    // We can change this later if required for better performance.
    return true;
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
