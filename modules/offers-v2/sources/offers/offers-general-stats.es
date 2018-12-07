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
 * check if the offer come from dropdown or not
 */
const isDropdownOffer = offerObj =>
  offerObj
  && offerObj.rs_dest
  && offerObj.rs_dest.length === 1
  && offerObj.rs_dest[0] === 'dropdown';


/**
 * OffersGeneralStats class
 */
export default class OffersGeneralStats {
  constructor(offersDB) {
    this.addedPerDayMap = new Map();
    this.offersDB = offersDB;
  }

  /**
   * whenever we get a new action for an offer
   */
  newOfferAction({ offer }) {
    this._checkOfferAdded(offer.offer_id, offer);
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
   * will return the number of offers added today
   */
  offersAddedToday() {
    const today = todayTs();
    return this.addedPerDayMap.has(today)
      ? this.addedPerDayMap.get(today).size
      : 0;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            Private methods
  //

  _checkOfferAdded(offerID, offerObj) {
    // we will check if the offer was added today
    const addedActionCont = this.offersDB.getOfferActionMeta(offerID,
      ActionID.AID_OFFER_DB_ADDED);
    if (addedActionCont && !isDropdownOffer(offerObj)) {
      const dayAddedTs = dayTs(addedActionCont.l_u_ts);
      addOfferOnSetDayMap(this.addedPerDayMap, dayAddedTs, offerID);
    }
  }

  _clear() {
    this.addedPerDayMap.clear();
  }
}
