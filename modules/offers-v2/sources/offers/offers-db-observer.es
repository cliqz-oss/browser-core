/**
 * This module will provide a helper observer class to detect changes on offers.
 *  - offers expiration
 */
import utils from '../../core/utils';
import { timestampMS } from '../utils';
import logger from '../common/offers_v2_logger';

// ////////////////////////////////////////////////////////////////////////////

const MAX_EXP_TIME = (1000 * 60 * 60 * 24 * 500);

// ////////////////////////////////////////////////////////////////////////////
//                        Helper methods

const getAllValidOffers = offersDB => offersDB.getOffers();

/**
 * calculate next expiration time for an offerElement (results of offerDB).
 * @returns null if cannot be computed (offer doesnt have expiration?)
 *          > 0 if the offer will expire in the future
 *          <= 0 if already expired
 */
const calcExpirationTimeMs = (offerElement) => {
  // by default, old offers without expiration ms we do not expire them
  const expirationMs = offerElement ? offerElement.offer.expirationMs : undefined;
  if (expirationMs === undefined) {
    return undefined;
  }
  return (offerElement.created + expirationMs) - timestampMS();
};

const isOfferExpired = offerElement => calcExpirationTimeMs(offerElement) <= 0;

const getExpiredOffers = offerList => offerList.filter(oe => isOfferExpired(oe));
const getNonExpiredOffers = offerList => offerList.filter(oe => !isOfferExpired(oe));

const getNextExpirationTimeMs = (offerList) => {
  // just set a random number here
  let nextExpTime = MAX_EXP_TIME;
  offerList.forEach((oe) => {
    const expTime = calcExpirationTimeMs(oe);
    if (expTime !== undefined) {
      nextExpTime = Math.min(nextExpTime, expTime);
    }
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
    this.expirationTimer = null;

    // setup the callback here
    this._offersDBCallback = this._offersDBCallback.bind(this);
    this.offersDB.registerCallback(this._offersDBCallback);
  }

  unload() {
    if (this.expirationTimer) {
      utils.clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
    this.offersDB.unregisterCallback(this._offersDBCallback);
  }

  /**
   * will perform an expiratoin check on the next ms milliseconds
   */
  observeExpirations() {
    // we check here for when is the next time we should be called
    if (this.expirationTimer) {
      utils.clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }

    const nextExpirationTimeMs = calculateNextExpirationTimeMs(this.offersDB);
    if (nextExpirationTimeMs === null || nextExpirationTimeMs < 0) {
      return;
    }

    // set the timer to be executed in that time
    this.saveInterval = utils.setTimeout(() => {
      removeExpiredOffers(this.offersDB);
      this.observeExpirations();
    }, nextExpirationTimeMs + 10);
  }


  _offersDBCallback(msg) {
    if (msg.evt === 'offer-added') {
      // renew expirations when an offer is added, other case are not important
      this.observeExpirations();
    }
  }
}

