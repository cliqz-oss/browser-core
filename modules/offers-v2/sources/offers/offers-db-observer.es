/**
 * This module will provide a helper observer class to detect changes on offers.
 *  - offers expiration
 */
import { setTimeout } from '../../core/timers';
import { timestampMS } from '../utils';
import logger from '../common/offers_v2_logger';
import OffersConfigs from '../offers_configs';

// ////////////////////////////////////////////////////////////////////////////

const MAX_EXP_TIME = (1000 * 60 * 60 * 24 * 500);
const MAX_TIMEOUT_DELAY = 1000 * 60 * 60 * 24; // one day
const MIN_TIMEOUT_DELAY = 1000 * 60 * 5; // five minutes

// ////////////////////////////////////////////////////////////////////////////
//                        Helper methods

const getAllValidOffers = offersDB => offersDB.getOffers();

/**
 * calculate next expiration time for an offerElement (results of offerDB).
 * @returns > 0 if the offer will expire in the future
 *          <= 0 if already expired
 */
const calcExpirationTimeMs = (offerElement) => {
  //
  // Offer live time, as given by backend or default
  //
  const expFromConfig = OffersConfigs.OFFERS_STORAGE_DEFAULT_TTS_SECS * 1000;
  const expirationMs = offerElement.offer.expirationMs || expFromConfig;
  const offerTill = Math.min(
    offerElement.created + expirationMs,
    offerElement.last_update + expFromConfig
  );
  //
  // Campaign live time if given by backend
  //
  const campaignTillSec = ['offer', 'ui_info', 'template_data', 'validity'].reduce(
    (soFar, field) => (soFar ? soFar[field] : null),
    offerElement
  );
  const campaignTill = campaignTillSec * 1000;
  //
  // Combine both
  //
  const validTill = campaignTill ? Math.min(campaignTill, offerTill) : offerTill;
  return validTill - timestampMS();
};

export const isOfferExpired = offerElement => calcExpirationTimeMs(offerElement) <= 0;

const getExpiredOffers = offerList => offerList.filter(oe => isOfferExpired(oe));
const getNonExpiredOffers = offerList => offerList.filter(oe => !isOfferExpired(oe));

const getNextExpirationTimeMs = (offerList) => {
  // just set a random number here
  let nextExpTime = MAX_EXP_TIME;
  offerList.forEach((oe) => {
    const expTime = calcExpirationTimeMs(oe);
    nextExpTime = Math.min(nextExpTime, expTime);
  });
  return nextExpTime === MAX_EXP_TIME ? null : nextExpTime;
};

const removeExpiredOffers = (offersDB) => {
  const validOffers = getAllValidOffers(offersDB);
  const expiredOffers = getExpiredOffers(validOffers);
  logger.debug('Removing the following expired offers: ', expiredOffers);
  expiredOffers.forEach((offerElement) => {
    offersDB.eraseOfferObject(offerElement.offer_id);
  });
};

const calculateNextExpirationTimeMs = (offersDB) => {
  const validOffers = getAllValidOffers(offersDB);
  const nonExpiredOffers = getNonExpiredOffers(validOffers);
  return getNextExpirationTimeMs(nonExpiredOffers);
};


// ////////////////////////////////////////////////////////////////////////////

/**
 * The observer class handler
 */
export default class OfferDBObserver {
  constructor(offersDB) {
    this.offersDB = offersDB;

    // setup the callback here
    this._offersDBCallback = this._offersDBCallback.bind(this);
    this.offersDB.registerCallback(this._offersDBCallback);
    this._timerId = null;
  }

  unload() {
    this._resetTimer();
    this.offersDB.unregisterCallback(this._offersDBCallback);
  }

  _resetTimer() {
    if (!this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  observeExpirations() {
    this._resetTimer();
    this._observeExpirations();
  }

  _observeExpirations() {
    removeExpiredOffers(this.offersDB);
    const nextExpirationTimeMs = calculateNextExpirationTimeMs(this.offersDB);
    if (!nextExpirationTimeMs || nextExpirationTimeMs <= 0) {
      return;
    }
    this._timerId = setTimeout(() => {
      this._observeExpirations();
    }, Math.min(Math.max(nextExpirationTimeMs + 10, MIN_TIMEOUT_DELAY), MAX_TIMEOUT_DELAY));
  }

  _offersDBCallback(msg) {
    if (msg.evt === 'offer-added') {
      // renew expirations when an offer is added, other case are not important
      this.observeExpirations();
    }
  }
}
