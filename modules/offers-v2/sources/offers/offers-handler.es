/**
 * @module offers-v2
 */
// Component description see the comment to `OffersHandler` class below

import MessageQueue from '../../core/message-queue';
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
import Offer, { NOTIF_TYPE_TOOLTIP } from './offer';
import OfferCollection, { getGroupKey } from './offer-collection';
import IntentOffersHandler from './intent-offers-handler';
import OffersMonitorHandler from './offers-monitoring';
import ActionID from './actions-defs';
import Blacklist from './blacklist';
import OffersToPageRelationStats from './relation-stats/offers-to-page';
import chooseBestOffer from './best-offer';
import { OfferMatchTraits } from '../categories/category-match';
import { getDynamicContent } from './dynamic-offer';

import IntentGatherer from './jobs/intent-gather';
import DBReplacer from './jobs/db-replacer';
import HardFilters from './jobs/hard-filters';
import SoftFilters, { shouldTriggerOnAdvertiser } from './jobs/soft-filters';
import ContextFilter from './jobs/context-filters';
import ThrottlePushToRewardsFilter, { THROTTLE_PER_DOMAIN, THROTTLE_IGNORE_DOMAIN } from './jobs/throttle';
import ShuffleFilter from './jobs/shuffle';

const REWARD_BOX_REAL_ESTATE_TYPE = isGhostery ? 'ghostery' : 'offers-cc';

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

/**
 * note: `O(n*m)` complexity, where `n` and `m` are the sizes of both input arrays
 * @template {E}
 * @param {Array<E>} uniques
 * @param {Array<E>} elements
 * @returns {Array<E>} a concatenation of the given `uniques` array
 * and the items from the `elements` array not included in the former.
 */
const concatExcludingDuplicates = (uniques, elements = []) => uniques.concat(
  elements.filter(element => !uniques.includes(element))
);

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
  }) {
    this.intentHandler = intentHandler;
    this.offersDB = offersDB;
    this.offersDBObserver = new OfferDBObserver(this.offersDB);
    this.offersGeneralStats = new OffersGeneralStats(this.offersDB);
    this.offersMonitorHandler = new OffersMonitorHandler(sigHandler, this.offersDB, eventHandler);

    this.intentOffersHandler = new IntentOffersHandler(backendConnector, intentHandler);

    this.offersAPI = new OffersAPI(sigHandler, this.offersDB, backendConnector);

    this.sigHandler = sigHandler;

    this.blacklist = new Blacklist();
    this.blacklist.init();

    this.offersToPageRelationStats = new OffersToPageRelationStats();

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
    this.throttlePushRewardsBoxFilter = new ThrottlePushToRewardsFilter(
      config.settings.THROTTLE_OFFER_APPEARANCE_MODE === 'PER_DOMAIN'
        ? THROTTLE_PER_DOMAIN
        : THROTTLE_IGNORE_DOMAIN
    );
    this.jobsPipeline = [
      new IntentGatherer(),
      new DBReplacer(),
      // Add after `DBReplacer`, so that offers in `OffersDB` can be
      // updated to new versions from the backend.
      chipdeHandler && chipdeHandler.getOffersJobFilter(),
      new HardFilters(),
      this.throttlePushRewardsBoxFilter,
      new ContextFilter(),
      new SoftFilters(),
      ShuffleFilter, // for competing offers, avoid first-offer-from-backend bias
    ]
      .filter(Boolean); // remove undefined entries

    this.nEventsProcessed = 0; // Used as a wait marker by tests
  }

  async init() {
    return true;
  }

  destroy() {
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
    const offers = this.offersDB.getOffersByRealEstate(REWARD_BOX_REAL_ESTATE_TYPE);
    const [counter, action] = [1, 'offer_read'];
    offers.forEach(({ offer }) => this.offersDB.incOfferAction(offer.offer_id, action, counter));
    this.offersToPageRelationStats.invalidateCache();
  }

  /**
   * @typedef {object} RelevanceMarkedGroupedOffer
   * @prop {OfferData} offer_data
   * @prop {string} offer_id
   * @prop {string} group
   * @prop {string} created_ts
   * @prop {object} attrs
   * @prop {string|null} attrs.state
   * @prop {boolean} attrs.isCodeHidden
   * @prop {Array<string>} attrs.landing monitor pattern list
   * @prop {string} last_update_ts
   * @prop {boolean} relevant
   */
  /**
   * @param {{ filters: {[name: string]: any } }} filters
   * @param {{ catMatches?: CategoriesMatchTraits, urlData?: UrlData }} [opts={}]
   * @return {Array<RelevanceMarkedGroupedOffer>}
   * list of [`RelevanceMarkedGroupedOffer`]{@link RelevanceMarkedGroupedOffer}
   */
  getStoredOffersWithMarkRelevant(filters, { catMatches, urlData } = {}) {
    if (!this.offersAPI) { return []; }
    const offers = this.offersAPI.getStoredOffers(filters);
    if (!urlData || !catMatches) { return offers; }
    const offersForStats = this.offersDB.getOffersByRealEstate(REWARD_BOX_REAL_ESTATE_TYPE);
    const stats = this.offersToPageRelationStats.stats(offersForStats, catMatches, urlData);
    const relevant = stats.related.concat(stats.owned);
    return offers.map(({ offer_info: offerInfo, ...rest }) => {
      const offer = new Offer(offerInfo);
      return {
        ...rest,
        offer_data: offerInfo,
        relevant: relevant.includes(offer.uniqueID),
        group: getGroupKey(offer)
      };
    });
  }

  updateIntentOffers() {
    return this.intentOffersHandler.updateIntentOffers();
  }

  getOffersForIntent(intentName) {
    return this.intentOffersHandler.getOffersForIntent(intentName);
  }

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
   * push a single offer to its real-estates, or push a collection of offers to the reward-box.
   *
   * prerequisite:
   * offer or offer collection must have been fully triaged for publication beforehand.
   *
   * @param {OfferCollection} offerCollection
   * @param {UrlData} urlData
   * @param {CategoriesMatchTraits} catMatches
   * @param {PushOffersToRealEstatesOptions?} opts object with the following optional property:
   *   * {object?} offerData
   *   `offer_data` to publish instead of that from `offer`
   * @return {Promise<Boolean>} resolves to `true` on success
   */
  _pushOffersToRealEstatesWrapped(offerCollection, urlData, catMatches, { offerData } = {}) {
    const url = urlData.getRawUrl();

    const bestOffer = offerCollection.getBestOffer();
    const displayRule = {
      type: 'exact_match',
      url: [url],
      display_time_secs: bestOffer.ruleInfo.display_time_secs,
    };

    const offers = offerCollection.getOffers();
    const matchTraits = new OfferMatchTraits(
      catMatches,
      offers.map(offer => offer.categories).reduce(concatExcludingDuplicates, []), // O(n^2)
      urlData.getDomain() || ''
    );

    const result = offerCollection.hasMultipleEntries()
      ? this.offersAPI.pushOfferCollection(
        offerCollection,
        [REWARD_BOX_REAL_ESTATE_TYPE],
        { displayRule, matchTraits }
      )
      : this.offersAPI.pushOffer(
        bestOffer,
        { displayRule, matchTraits, offerData }
      );

    return Promise.resolve(result);
  }

  /**
   * decorates the `_pushOffersToRealEstatesWrapped` method
   * to properly handle an offer triggered on the advertiser's url,
   * i.e. that has bypassed the global blacklist
   * (see soft-filters/shouldTriggerOnAdvertiser).
   *
   * @param {OfferCollection} offerCollection
   * @param {UrlData} urlData
   * @param {CategoriesMatchTraits} catMatches
   * @return {Promise<Boolean>} resolves to `true` on success
   */
  _pushOffersToRealEstates(offerCollection, urlData, catMatches) {
    if (offerCollection.hasMultipleEntries()) {
      return this._pushOffersToRealEstatesWrapped(offerCollection, urlData, catMatches);
    }
    // only push a single offer: handle trigger-on-advertiser
    const offer = offerCollection.getBestOffer();
    const offerData = shouldTriggerOnAdvertiser(offer, urlData)
      ? offer.getDataObjectWithNotifType(offer.getTriggerOnAdvertiserNotifType())
      : null;
    const opts = offerData ? { offerData } : {};

    return this._pushOffersToRealEstatesWrapped(offerCollection, urlData, catMatches, opts);
  }

  /**
   * @param {UrlData} urlData
   * @return {Promise<Array<Offer>>} resolves to an up-to-date list of relevant offers
   */
  async _updateOffers(urlData) {
    if (this.intentOffersHandler.thereIsNewData()) {
      await this.intentOffersHandler.updateIntentOffers();
    }

    const jobContext = {
      ...this.context,
      offersHandler: this,
      offerIsFilteredOutCb: this._onOfferIsFilteredOut.bind(this),
      urlData
    };

    return executeJobList(this.jobsPipeline, jobContext);
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

  /**
   * wrapper for {@link OffersHandler#_selectAndProcessPushableOffers}.
   * if any, sends a notification for an unread offer
   * before calling {@link OffersHandler#_selectAndProcessPushableOffers}.
   * if the latter did not push any offers and there is an unread offer,
   * pushes it to a tooltip.
   * @param {UrlChangeEventPayload}
   * @return {Promise<Boolean>} resolves to `true` when the most relevant offer was selected,
   * processed and pushed. `false` otherwise.
   */
  async _processEventWrapped({ urlData, catMatches }) {
    const { untouched, ignored } = this._getUntouchedOffers(catMatches, urlData);
    const pushedOfferCollection = await this._selectAndProcessPushableOffersIfAny(
      catMatches, urlData
    );
    const didPush = !pushedOfferCollection.isEmpty();
    const shouldShowReminderTooltip = !didPush && ignored.length > 0;
    if (shouldShowReminderTooltip) {
      const lastIgnored = ignored[ignored.length - 1];
      this._showTooltip(lastIgnored, urlData);
      return false;
    }
    // we want to notify the count of unread offers even when offers were pushed,
    // but pushed offers are exluded from the count
    const isNotPushedOffer = id => !pushedOfferCollection.has(id);
    const unreadCount = untouched.filter(isNotPushedOffer).length;
    if (unreadCount) {
      this._notifyUnreadCount(urlData, unreadCount);
    }
    return didPush;
  }

  /**
   * select the most relevant pushable offer, and if any, preload images into it,
   * then push it to its real-estates and update domain-based throttling accordingly.
   *
   * @param {CategoriesMatchTraits} catMatches
   * @param {UrlData} urlData
   * @return {Promise<OfferCollection>} resolves to the pushed offer collection.
   */
  async _selectAndProcessPushableOffersIfAny(catMatches, urlData) {
    const collection = await this._getOfferCollection(catMatches, urlData);
    if (collection.isEmpty()) {
      return collection;
    }

    await this._pushOffersToRealEstates(collection, urlData, catMatches);

    this._updateDomainBasedThrottling(collection, urlData);

    return collection;
  }

  /**
   * if ok to display offers, generate an up-to-date collection of relevant offers
   * based on the given match traits and url,
   * then select which of these should be displayed, and signal any not selected.
   * @param {CategoriesMatchTraits} catMatches
   * @param {UrlData} urlData
   * @return {Promise<OfferCollection>} resolves to an `OfferCollection`
   * of relevant offers if any:
   * * empty when no offers should be displayed
   * * a single offer when only the most relevant offer should be displayed
   * * more than one offer when a collection of offers should be displayed.
   */
  async _getOfferCollection(catMatches, urlData) {
    logger.debug('Offers handler processing a new event', urlData.getRawUrl());

    if (!shouldWeShowAnyOffer(this.offersGeneralStats)) {
      logger.debug('we should not show any offer now');
      return new OfferCollection();
    }

    const offers = await this._updateOffers(urlData);
    if (!offers || !offers.length) {
      return new OfferCollection();
    }

    const targetedNotSilentOffers = offers.filter(
      offer => offer.isTargetedAndNotSilent()
    );
    let bestOffer = this._chooseBestOffer(
      // choose best offer from targeted non-silent offers if any
      targetedNotSilentOffers.length ? targetedNotSilentOffers : offers,
      catMatches
    );
    if (!bestOffer) {
      return new OfferCollection();
    }

    // get dynamic content for best offer
    if (prefs.get('dynamic-offers.enabled', false)) {
      bestOffer = await getDynamicContent(bestOffer, urlData, catMatches);
    }

    // select pushable offers: collection starting with best offer
    const rewardBoxOffers = !config.settings.ENABLE_OFFER_COLLECTIONS
      ? [bestOffer]
      : offers.filter(
        offer => offer.destinationRealEstates.includes(REWARD_BOX_REAL_ESTATE_TYPE)
          && !shouldTriggerOnAdvertiser(offer, urlData)
      );
    const shouldPushCollection = config.settings.ENABLE_OFFER_COLLECTIONS
      && rewardBoxOffers.includes(bestOffer);

    const pushableOffers = shouldPushCollection ? rewardBoxOffers : [bestOffer];
    const offerCollection = new OfferCollection(pushableOffers, bestOffer);

    // signal excluded offers
    const isExcludedOffer = offer => !offerCollection.has(offer.uniqueID);
    offers.filter(isExcludedOffer).forEach(
      offer => this._onOfferIsFilteredOut(offer, ActionID.AID_OFFER_FILTERED_COMPETE)
    );

    return offerCollection;
  }

  /**
   * wrapper for {@link module:best-offer.chooseBestOffer}
   *
   * @param {Array<Offer>} offers
   * @param {CategoriesMatchTraits} catMatches
   * @return {Offer|false} best offer if any, `false` otherwise
   */
  _chooseBestOffer(offers, catMatches) {
    const getOfferDisplayCount = o => this.offersDB.getPushCount(o.uniqueID);

    const [bestOffer, score] = chooseBestOffer(offers, catMatches, getOfferDisplayCount);
    const hasBestOffer = bestOffer && score;
    if (!hasBestOffer) {
      return false;
    }
    logger.debug(`Offer selected with score ${score}:`, bestOffer.uniqueID);

    return bestOffer;
  }


  /**
   * update domain-based throttling
   * @param {OfferCollection} offerCollection
   * @param {UrlData} urlData
   * @return {void}
   */
  _updateDomainBasedThrottling(offerCollection, urlData) {
    if (offerCollection.isEmpty()) {
      return;
    }
    const host = urlData.getDomain();
    if (offerCollection.hasMultipleEntries()) {
      // offer collections are pushed to the reward-box: ok to force timer reset for host
      this.throttlePushRewardsBoxFilter.resetTimer(host);
      return;
    }
    // single offer is best offer
    const offer = offerCollection.getBestOffer();
    this.throttlePushRewardsBoxFilter.onTriggerOffer(offer, host);
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
      const { erased = false, expired = true } = message.extraData || {};
      this.offersAPI.offerRemoved(offerID, campaignID, erased, expired);
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

  /**
   * @param {CategoriesMatchTraits} catMatches
   * @param {UrlData} urlData
   * @return {object}
   * @prop {string[]} untouched ids of locally-stored relevant untouched offers,
   * i.e. relevant to the given `catMatches` and `urlData` and
   * previously triggered or actioned (e.g. code_copied, offer_closed, etc.).
   * @prop {string[]} ignored subset of `untouched` limited to offers
   * that have not recently been reminded to the user (tooltip),
   * and excluding offers for which the `urlData` corresponds to the advertiser's domain.
   */
  _getUntouchedOffers(catMatches, urlData) {
    const offers = this.offersDB.getOffersByRealEstate(REWARD_BOX_REAL_ESTATE_TYPE);
    const stats = this.offersToPageRelationStats.statsCached(offers, catMatches, urlData);

    const relevant = Array.from(new Set(stats.related.concat(stats.owned)));
    const untouched = relevant.filter(oid => !stats.touched.includes(oid));
    // (untouched & related) - tooltip - owned
    const ignored = untouched.filter(
      oid => stats.related.includes(oid)
        && !stats.owned.includes(oid)
        && !stats.tooltip.includes(oid)
    );
    return { untouched, ignored };
  }

  _notifyUnreadCount(urlData, count) {
    const tabId = urlData.getTabId();
    if (count) { events.pub('offers-notification:unread-offers-count', { count, tabId }); }
  }

  _showTooltip(offerId, urlData) {
    const offer = this.getOfferObject(offerId);
    if (!offer) { return; }
    const { ui_info: uiInfo = {} } = offer;
    const newuiInfo = { ...uiInfo, notif_type: NOTIF_TYPE_TOOLTIP };
    // pushOffer will not update the notif_type in the OffersDB because
    // this offer is from OffersDB and its `version` is unchanged
    this.offersAPI.pushOffer(
      new Offer({ ...offer, ui_info: newuiInfo }),
      { displayRule: { url: [urlData.getRawUrl()] } }
    );
  }
}
