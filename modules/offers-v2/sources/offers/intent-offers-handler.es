import { timestampMS, shouldKeepResource } from '../utils';
import logger from '../common/offers_v2_logger';
import Offer from './offer';
import prefs from '../../core/prefs';
import { buildCachedMap } from '../common/cached-map-ext';


const INTENT_OFFERS_CACHE_ID = 'cliqz-intent-offers-db';


const areSetsEqual = (s1, s2) => {
  if (s1.size !== s2.size) {
    return false;
  }
  const keys = [...s1.keys()];
  for (let i = 0; i < keys.length; i += 1) {
    if (!s2.has(keys[i])) {
      return false;
    }
  }
  return true;
};

/**
 * Helper class to hold a cache entry
 */
class CacheEntry {
  constructor(data, durationSecs) {
    this.data = data;
    this.expireTS = timestampMS() + (durationSecs * 1000);
  }

  // An object of type CacheEntry, after storing and loading back from
  // the local storage, is no more of type CacheEntry. In particular,
  // the function "expired()" is missed in the object. As a workaround,
  // define and use the function as a class function.
  //
  // @param [CacheEntry-like] self  Rewriting of `self.expired()`
  static expired(self) {
    return (timestampMS() > self.expireTS);
  }
}

/**
 * Will hold all the offers associated to an intent
 */
export default class IntentOffersHandler {
  constructor(backendConnector, intentHandler) {
    this.intentOffers = buildCachedMap(INTENT_OFFERS_CACHE_ID, !prefs.get('offersDevFlag', false));
    this.intentOffers.init();
    this.backendConnector = backendConnector;
    this.intentHandler = intentHandler;
  }

  /**
   * checks if there are new intents that should be fetched
   */
  thereIsNewData() {
    return !areSetsEqual(new Set(this._getLatestIntentsNames()),
      new Set(this._getCurrentIntentsNames()));
  }

  /**
   * fetches all the associated offers for the new intents
   */
  updateIntentOffers() {
    // clear all current ones and fetch the new ones
    const currentIntents = this._getCurrentIntentsNames();
    this.intentOffers.clear();
    return Promise.all(currentIntents.map(
      intentName => this.fetchOffersForIntent(intentName)
    ) || []);
  }

  /**
   * Whenever a new intent is activated we should call this method to fetch
   * the associated offers for this intent.
   */
  fetchOffersForIntent(intentName) {
    const intent = this.intentHandler.getActiveIntent(intentName);
    if (!intent) {
      return Promise.resolve(false);
    }

    // check if we have it cached
    this._expireCache();

    // check if we have in the cache
    if (this.intentOffers.has(intent.getName())) {
      return Promise.resolve(true);
    }
    return this.backendConnector.sendApiRequest(
      'offers',
      { intent_name: intentName },
      'GET'
    ).then((aIntentOffers) => {
      if (!aIntentOffers) {
        logger.error('Invalid intent offers fetched for intent: ', intentName);
        return Promise.reject();
      }

      // #EX-7061 - filter all the offers that dont belong to us
      const keepOffer = o =>
        o && ((o.user_group === undefined) || shouldKeepResource(o.user_group));

      const intentOffers = aIntentOffers.filter(keepOffer);

      this.setIntentOffers(intent, intentOffers);
      return Promise.resolve(true);
    });
  }

  setIntentOffers(intent, offers) {
    this.intentOffers.set(intent.getName(),
      new CacheEntry(offers, intent.getDurationSecs()));
  }

  getOffersForIntent(intentName) {
    return this.intentOffers.has(intentName)
      ? this.intentOffers.get(intentName).data.map(offerObj => new Offer(offerObj))
      : [];
  }

  _expireCache() {
    this.intentOffers.keys().forEach((intentID) => {
      const cacheEntry = this.intentOffers.get(intentID);
      if (CacheEntry.expired(cacheEntry)) {
        this.intentOffers.delete(intentID);
      }
    });
  }

  // return the list of latest intents active we have
  _getLatestIntentsNames() {
    this._expireCache();
    return [...this.intentOffers.keys()];
  }

  // return the current list of intents active
  _getCurrentIntentsNames() {
    return this.intentHandler.getActiveIntents().map(i => i.getName()) || [];
  }
}
