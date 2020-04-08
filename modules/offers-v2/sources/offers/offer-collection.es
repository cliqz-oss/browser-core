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

/**
 * WARNING: this function mutates its `offersByDisplayID` argument.
 *
 * @param {Map<string,Offer>} offersByDisplayID offers keyed by displayID
 * @param {Offer} offer
 * @returns {Map<string,Offer>} the given `offersByDisplayID` map,
 * either unchanged, when it already includes an entry
 * at the `displayID` of the given `offer`,
 * or else with the given `offer` added at the corresponding `displayID` key.
 */
const addOfferWhenNewDisplayID = (offersByDisplayID, offer) =>
  (offersByDisplayID.has(offer.displayID)
    ? offersByDisplayID
    : offersByDisplayID.set(offer.displayID, offer));

/**
 * @param {Offer[]} offers
 * @returns {Offer[]} a new array based on the given `offers` array
 * excluding offers with the same `displayID`
 * as another sequentially preceding offer.
 */
const keepAtMostOneOfferPerDisplayID = offers => [
  ...offers.reduce(addOfferWhenNewDisplayID, new Map()).values()
];

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
   * when instantiated from a given `offers` array,
   * the resulting `OfferCollection` is limited to offers
   * starting with the given `bestOffer`
   * from at most the first `settings.MAX_GROUPS_IN_OFFER_COLLECTIONS` groups,
   * where the group of an offer is defined by its `page_imp` monitor
   * or, when not defined, its `campaign_id`.
   * also, the resulting `OfferCollection` is limited to at most the first offer
   * per `displayID`.
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
     * at most `settings.MAX_GROUPS_IN_OFFER_COLLECTIONS` groups,
     * and to at most one offer per `displayID`.
     */
    this.entries = new Map(
      [...createOffersByGroupMap(reorderedOffers)]
        .flatMap(([group, offers]) =>
          keepAtMostOneOfferPerDisplayID(offers).map(toKeyedCollectionEntry(group)))
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
