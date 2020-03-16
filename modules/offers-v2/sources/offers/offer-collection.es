import { hashString } from '../utils';
import { PAGE_IMPRESSION_MONITOR_TYPE } from '../common/constant';
import config from '../../core/config';

const MAX_GROUPS_IN_OFFER_COLLECTIONS = 3;

const getGroupKeyFallback = offer => offer.campaignID;

export function getGroupKey(offer) {
  const pageImpPatterns = offer.getMonitorPatterns(PAGE_IMPRESSION_MONITOR_TYPE) || [];
  const hasPageImpPatterns = pageImpPatterns.length;

  if (hasPageImpPatterns) {
    /** @type number */
    const hash = hashString(JSON.stringify(pageImpPatterns));
    return `${hash}`;
  }

  return getGroupKeyFallback(offer);
}

function pullUpFront(array, element) {
  const isNotElement = item => item !== element;
  return [element].concat(array.filter(isNotElement));
}

const isMaxSize = entries => entries.size >= (
  config.settings.MAX_GROUPS_IN_OFFER_COLLECTIONS || MAX_GROUPS_IN_OFFER_COLLECTIONS
);

/**
 * @param {Map<K,V[]>} entries
 * @param {K} key
 * @param {V} value
 * @return {Map<K,V[]>}
 * a new map with the given value appended to the keyed list.
 */
const concatEntryWhenNotMaxKeys = (entries, key, value) =>
  (!entries.has(key) && isMaxSize(entries)
    ? entries
    : new Map(entries).set(
      key,
      entries.has(key) ? entries.get(key).concat(value) : [value]
    ));

/**
 * @param {Array<Offer>} offers
 * @return {Map<string, Offer[]>} map of group keys to a list of corresponding offers.
 * the order of group keys is derived from their order in the input `offers` list:
 * the first group key is that of the first offer in the list,
 * the second group key that of the next offer with a new group key, etc.
 * the max number of group keys in this map is limited to that defined by
 * `settings.MAX_GROUPS_IN_OFFER_COLLECTIONS`: all entries with group keys
 * beyond these are ignored.
 */
const createOffersByGroupMap = offers => offers.reduce(
  (groupedOffers, offer) => concatEntryWhenNotMaxKeys(groupedOffers, getGroupKey(offer), offer),
  new Map()
);

/**
 * @typedef {{ offer: Offer, group: string }} CollectionEntry
 */
/**
 * @param {string} group
 * @return {(offer: Offer) => [string, CollectionEntry]} projection from offer
 * to `offerID`-keyed `{ offer, group }` collection entry
 */
const toKeyedCollectionEntry = group => offer => [offer.uniqueID, { offer, group }];

class OfferCollection {
  static isInstance(obj) {
    return obj instanceof OfferCollection;
  }

  /**
   * @param {Array<Offer>=[]} offers
   * @param {Offer?} bestOffer default to offers[0]
   */
  constructor(offersList = [], bestOffer) {
    const reorderedOffers = bestOffer ? pullUpFront(offersList, bestOffer) : offersList.slice();
    this.bestOffer = reorderedOffers[0];
    /**
     * @type {Map<string, { offer: Offer, group: string }>}
     * map of `offerID` keys to `{ offer, group }` entries starting with that of the `bestOffer`,
     * sequentially ordered by group key, limited to offers of
     * at most `settings.MAX_GROUPS_IN_OFFER_COLLECTIONS` groups.
     */
    this.entries = new Map(
      [...createOffersByGroupMap(reorderedOffers)]
        .flatMap(([group, offers]) => offers.map(toKeyedCollectionEntry(group)))
    );
  }

  getBestOffer() {
    return this.bestOffer;
  }

  getLength() {
    return this.entries.size;
  }

  /**
   * WARNING: to avoid mutating this `OfferCollection` into an inconsistent state,
   * consider deep-copying the `Offer` instances of the returned array before altering them.
   * @return {Array<Offer>} list of this `OfferCollection`'s offers, starting with its `bestOffer`
   */
  getOffers() {
    return [...this.values()].map(({ offer }) => offer);
  }

  has(offerID) {
    return this.entries.has(offerID);
  }

  /**
   * WARNING: to avoid mutating this `OfferCollection` into an inconsistent state,
   * consider deep-copying the iterated entries before altering them.
   * @return {Iterator<{ offer: Offer, group: string }>}
   * iterator over the `{ offer, group }` entries of this collection,
   * starting with that of its `bestOffer` and grouped by group key.
   */
  values() {
    return this.entries.values();
  }

  isEmpty() {
    return !this.entries.size;
  }

  hasSingleEntry() {
    return this.entries.size === 1;
  }

  hasMultipleEntries() {
    return this.entries.size > 1;
  }
}

export default OfferCollection;

export const isOfferCollection = OfferCollection.isInstance;
