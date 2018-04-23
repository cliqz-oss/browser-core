/**
 * This module will store some global information about offers that can be used
 * to apply global filters
 */
import { timestampMS } from '../utils';
import ActionID from './actions-defs';

// helper timestamp methods
const DAY_MS = 1000 * 60 * 60 * 24;
const dayTs = ts => Math.floor((ts / DAY_MS));
const todayTs = () => dayTs(timestampMS());


/**
 * helper method to add an offer id in a mapToDay map
 */
const addOfferOnSetDayMap = (map, day, offerID) => {
  if (!map.has(day)) {
    map.set(day, new Set([offerID]));
  } else {
    map.get(day).add(offerID);
  }
};

/**
 * OffersGeneralStats class
 */
export default class OffersGeneralStats {
  constructor(offersDB) {
    this.displayPerDayMap = new Map();
    this.offersDB = offersDB;
  }

  /**
   * whenever we get a new action for an offer
   */
  newOfferAction({ offer }) {
    this._checkOfferDisplayed(offer.offer_id);
  }

  /**
   * Build all the data from the current offers DB
   */
  buildFromOffers(allStoredOffers) {
    // the format of the offers should be as follow:
    // {
    //   offer_id: cont.offer_obj.offer_id,
    //   offer: cont.offer_obj,
    //   last_update: cont.l_u_ts,
    //   created: cont.c_ts
    // };

    this._clear();
    allStoredOffers.forEach((o) => {
      this.newOfferAction({ offer: o.offer });
    });
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            QUERY METHODS
  // ///////////////////////////////////////////////////////////////////////////

  /**
   * will return the number of offers shown today
   */
  offersDisplayedToday() {
    const today = todayTs();
    return this.displayPerDayMap.has(today) ?
      this.displayPerDayMap.get(today).size :
      0;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            Private methods
  //

  _checkOfferDisplayed(offerID) {
    // we will check if the offer was shown today
    const displayedActionCont = this.offersDB.getOfferActionMeta(offerID,
      ActionID.AID_OFFER_DISPLAY_SESSION);
    if (displayedActionCont) {
      const dayDisplayedTs = dayTs(displayedActionCont.l_u_ts);
      addOfferOnSetDayMap(this.displayPerDayMap, dayDisplayedTs, offerID);
    }
  }

  _clear() {
    this.displayPerDayMap.clear();
  }
}
