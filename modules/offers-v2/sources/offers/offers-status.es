/**
 * This module will take care of holding the status of the offers and return the
 * proper status for each offer.
 * We will assume for now that any offer that is not in the list has an unknown
 * state, only the ones that are explicitly defined on the list will be treated
 * as they are.
 * For now we will not do it persistently.
 *
 * The possible status will be:
 *   - active: exists and still active
 *   - inactive: exists but is not active anymore
 *   - obsolete: doesn't exists (and hence is not active)
 *   - unknown: we do not know yet the status of the offer? (couldn't get the data from
 *              the backend for example)
 */

export default class OfferStatus {
  constructor() {
    // offer_id -> status
    this.statusMap = null;
    this.onStatusChangedCallback = null;
  }

  setStatusChangedCallback(onStatusChangedCallback) {
    this.onStatusChangedCallback = onStatusChangedCallback;
  }

  // this will load the status from an object (got from the backend)
  loadStatusFromObject(obj) {
    // reset current data
    this.statusMap = new Map();
    if (!obj) {
      return;
    }
    const offerIDs = Object.keys(obj);
    for (let i = 0; i < offerIDs.length; i += 1) {
      const offerID = offerIDs[i];
      this.statusMap.set(offerID, obj[offerID]);
    }
    if (this.onStatusChangedCallback) {
      this.onStatusChangedCallback();
    }
  }

  getOfferStatus(offerID) {
    if (this.statusMap === null) {
      return 'unknown';
    }
    return this.statusMap.has(offerID) ? this.statusMap.get(offerID) : 'unknown';
  }
}
