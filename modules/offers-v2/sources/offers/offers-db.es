/**
 *
 * The intent of this file is provide an interface to store the offers persistently
 * and also an API to perform different queries.
 *
 */
import logger from '../common/offers_v2_logger';
import OffersConfigs from '../offers_configs';
import { timestampMS } from '../utils';
import { buildCachedMap } from '../common/cached-map-ext';

const STORAGE_DB_DOC_ID = 'offers-db';

function isOfferExpired(offerData) {
  // Only return true when `validity` is provided
  try {
    return offerData.ui_info.template_data.validity < Date.now() / 1000;
  } catch (e) {
    logger.debug('Missing validity', offerData);
    return false;
  }
}

/**
 * This class will be used to hold all the information related to offers locally.
 * Will be the index for:
 * - offers object stored locally (storage).
 * - Signals we want to track per offer (history).
 * - index to retrieve offers from campaigns and campaigns from offers, etc.
 *
 * We will add a new interface for events to be propagated to registered callbacks:
 * {
 *   evt: 'event',
 *   offer: {}
 * }
 * evt types:
 * - 'offer-added'
 * - 'offer-updated'
 * - 'offer-action'
 * - 'offer-removed'
 * - 'offers-db-loaded'
 *
 */
class OfferDB {
  constructor(db) {
    this.tmpdb = db;
    this.offersIndexMap = buildCachedMap('offers-db-index', OffersConfigs.LOAD_OFFERS_STORAGE_DATA);
    this.displayIdIndexMap = buildCachedMap('offers-db-display-index', OffersConfigs.LOAD_OFFERS_STORAGE_DATA);

    // load and clean
    this._dbLoaded = false;
    this._loadPersistentData().then(() => {
      this._dbLoaded = true;
      this._pushCallbackEvent('offers-db-loaded', {});
    });

    // temporary mapping counter to know when to remove a display or not
    this.displayIDCounter = {};

    // we will dynamically keep track of which offers are related to a particular
    // campaign id: campaign_id -> Set(offersIDs)
    this.campaignToOffersMap = {};

    // map from client to offers
    this.clientToOffersMap = new Map();

    // map from offer type => set(offersIDs)
    this.typesToOffersMap = new Map();

    // callbacks list
    this.callbacks = new Map();
  }

  registerCallback(cb) {
    this.callbacks.set(cb, cb);
  }

  unregisterCallback(cb) {
    this.callbacks.delete(cb);
  }

  get dbLoaded() {
    return this._dbLoaded;
  }

  // ---------------------------------------------------------------------------
  // The public methods will go here
  // ---------------------------------------------------------------------------

  /**
   * will return the metadata for a particular offer or null if not exists
   * @param  {string} offerID the offer id
   * @return {object} metadata or null if not exists.
   * <pre>
   * {
   *   c_ts: when was created timestamp
   *   l_u_ts: when was last updated timestamp (any interaction).
   * }
   * </pre>
   */
  getOfferMeta(offerID) {
    if (!this.offersIndexMap.has(offerID)) {
      return null;
    }
    const container = this.offersIndexMap.get(offerID);
    return {
      c_ts: container.c_ts,
      l_u_ts: container.l_u_ts
    };
  }

  /**
   * adds a new offer object, this should be the object coming from the backend
   * with all the required fields
   * @param {[type]} offerID   [description]
   * @param {[type]} offerData [description]
   * @return {bool} true if was added | false otherwise
   */
  addOfferObject(offerID, offerData) {
    if (!this._isOfferValid(offerID, offerData)) {
      logger.warn(`addOfferObject: args invalid or data invalid: ${offerID} - ${offerData}`);
      return false;
    }

    let container = this.offersIndexMap.get(offerID);
    if (container) {
      logger.warn(`addOfferObject: The offer id: ${offerID} already exists, will not add it here`);
      return false;
    }

    // create the container and a copy of the offer data object to avoid issues
    const offerDataCpy = JSON.parse(JSON.stringify(offerData));
    container = this._createOfferContainer();
    container.offer_obj = offerDataCpy;
    this.offersIndexMap.set(offerID, container);

    // update index tables
    this._updateIndexTablesForOffer(offerID);

    // propagate event
    this._pushCallbackEvent('offer-added', container);

    return true;
  }

  /**
   * will remove the offer object but not the action history
   * @param  {[type]} offerID [description]
   * @return {boolean} true on success false otherwise
   */
  removeOfferObject(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`removeOfferObject: The offer id: ${offerID} is not stored`);
      return false;
    }

    // we should not remove this since we relay still on accessing the display_id
    // information of the offer
    // this._removeIndexTablesForOffer(offerID);

    // remove the data
    // delete container.offer_obj;
    container.removed = true;

    // last update
    container.l_u_ts = timestampMS();

    this.offersIndexMap.set(offerID, container);

    // propagate event
    this._pushCallbackEvent('offer-removed', container);

    return true;
  }

  /**
   * this method will completely remove the offer from the DB without leaving
   * any entry nor data associated to it.
   * @param  offerID to be removed
   * @return true on success | false otherwise
   */
  eraseOfferObject(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`eraseOfferObject: The offer id: ${offerID} is not stored`);
      return false;
    }

    // remove it from all tables
    this._removeIndexTablesForOffer(offerID);

    // remove it from DB
    this.offersIndexMap.delete(offerID);

    // propagate event
    this._pushCallbackEvent('offer-removed', container, { erased: true });

    return true;
  }

  /**
   * will return the offer object if we have it or null if not
   * Do not modify this object from outside.
   * @param  {[type]} offerID [description]
   * @return {[type]}         [description]
   */
  getOfferObject(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return null;
    }
    return container.offer_obj;
  }

  /**
   * will check if there is information about the offer or not
   * @param  {[type]}  offerID [description]
   * @return {Boolean}         true if there are or false otherwise
   */
  hasOfferData(offerID) {
    return this.offersIndexMap.has(offerID);
  }
  hasOfferObject(offerID) {
    if (this.getOfferObject(offerID)) {
      return true;
    }
    return false;
  }
  isOfferPresent(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return false;
    }
    return !container.removed;
  }

  /**
   * will update an offer object.
   * @param  {[type]} offerID   [description]
   * @param  {[type]} offerData [description]
   * @return {boolean} true on success | false otherwise
   */
  updateOfferObject(offerID, offerData) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`updateOfferObject: the offer with ID: ${offerID} is not present`);
      return false;
    }
    // check if the offer is valid and is the same
    if (!this._isOfferValid(offerID, offerData)) {
      logger.warn(`updateOfferObject: offer ${offerID} is not valid`);
      return false;
    }

    if (container.offer_obj) {
      // check if we have an old object here
      const localOffer = container.offer_obj;
      if (offerData.offer_id !== localOffer.offer_id ||
          offerData.campaign_id !== localOffer.campaign_id) {
        logger.warn('updateOfferObject: the offer core data is not similar? not supported for now');
        return false;
      }

      // we need to check if it is nescesary to migrate the values of the
      // old display id to the new if they have different ones
      if (offerData.display_id !== localOffer.display_id) {
        // migrate old to new
        this._migrateDisplayID(localOffer.display_id, offerData.display_id);
      }
    }
    // it is ok, we update the data
    container.offer_obj = JSON.parse(JSON.stringify(offerData));
    container.removed = false;

    // update timestamp
    container.l_u_ts = timestampMS();
    this.offersIndexMap.set(offerID, container);

    // propagate event
    this._pushCallbackEvent('offer-updated', container);

    return true;
  }

  /**
   * This function will check if an offer has been removed or not.
   */
  hasOfferRemoved(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return false;
    }
    return container.removed;
  }

  /**
   * this method will increment +1 a particular action for a given offer. This
   * will also update if needed the display ID
   * @param  {[type]} offerID  [description]
   * @param  {[type]} actionID [description]
   * @param  {[type]} incDisplay if true this will also increment the signal in the
   *                             display map.
   * @return {boolean} true on success | false otherwise
   */
  incOfferAction(offerID, actionID, incDisplay = true, count = 1) {
    if (!offerID || !actionID) {
      logger.warn('incOfferAction: invalid args');
      return false;
    }
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`incOfferAction: The offer id: ${offerID} is not stored - ${actionID}`);
      return false;
    }

    const now = timestampMS();
    const offerObj = container.offer_obj;
    let actionCont = container.offer_actions[actionID];
    if (!actionCont) {
      // create a new one
      actionCont = this._createElementContainer();
      container.offer_actions[actionID] = actionCont;
      actionCont.count = 0;
    }
    actionCont.count += count;
    actionCont.l_u_ts = now;

    if (incDisplay) {
      const displayMap = this.displayIdIndexMap;
      const displayActionMap = displayMap.get(offerObj.display_id) || {};
      let displayCont = displayActionMap[actionID];
      if (!displayCont) {
        displayCont = this._createElementContainer();
        displayActionMap[actionID] = displayCont;
        displayCont.count = 0;
      }
      displayCont.count += count;
      displayCont.l_u_ts = now;
      this.displayIdIndexMap.set(offerObj.display_id, displayActionMap);
    }

    container.l_u_ts = now;
    this.offersIndexMap.set(offerID, container);

    // propagate event
    this._pushCallbackEvent('offer-action', container, { actionID });

    return true;
  }

  /**
   * will return the metadata for a particular actionID and offerID.
   * @param  {[type]} offerID  [description]
   * @param  {[type]} actionID [description]
   * @return {object} the metadata for an action or null | undefined if not found
   * <pre>
   * {
   *   c_ts: timestamp,
   *   l_u_ts: timestamp,
   *   count: N,
   * }
   * </pre>
   */
  getOfferActionMeta(offerID, actionID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return null;
    }
    return container.offer_actions[actionID];
  }

  /**
   * add a generic attribute data to be stored on the offer with a generic value
   * @param {[type]} offerID [description]
   * @param {[type]} attrID  [description]
   * @param {[type]} data    [description]
   * @return {boolean} true on success | false otherwise
   */
  addOfferAttribute(offerID, attrID, data) {
    if (!offerID || !attrID) {
      logger.warn('addOfferAttribute: invalid args');
      return false;
    }
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`addOfferAttribute: The offer id: ${offerID} is not stored`);
      return false;
    }

    const offerAttr = container.offer_attrs;
    let attrCont = offerAttr[attrID];
    if (!attrCont) {
      attrCont = this._createElementContainer();
      offerAttr[attrID] = attrCont;
    }

    const now = timestampMS();

    attrCont.attr = data;
    attrCont.l_u_ts = now;

    container.l_u_ts = now;
    this.offersIndexMap.set(offerID, container);

    return true;
  }

  /**
   * will return the associated attribute for the given offer and attrID, null if
   * not exists
   * @param  {[type]} offerID [description]
   * @param  {[type]} attrID  [description]
   * @return {[type]}         [description]
   */
  getOfferAttribute(offerID, attrID) {
    if (!offerID || !attrID) {
      logger.warn('getOfferAttribute: invalid args');
      return null;
    }
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`getOfferAttribute: The offer id: ${offerID} is not stored`);
      return null;
    }

    const offerAttr = container.offer_attrs[attrID];
    if (!offerAttr) {
      return null;
    }
    return offerAttr.attr;
  }

  /**
   * will return the metadata of a display id for a particular actionID and displayID.
   * @param  {[type]} displayID  [description]
   * @param  {[type]} actionID [description]
   * @return {object} the metadata for an action and displayID or null if not found
   * <pre>
   * {
   *   c_ts: timestamp,
   *   l_u_ts: timestamp,
   *   count: N,
   * }
   * </pre>
   */
  getOfferDisplayActionMeta(displayID, actionID) {
    const container = this.displayIdIndexMap.get(displayID);
    if (!container || !actionID) {
      return null;
    }
    return container[actionID];
  }

  /**
   * will return the associated campaign id for a particular offer, or null if not found
   * @param  {[type]} offerID [description]
   * @return {[type]}         [description]
   */
  getCampaignID(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return null;
    }
    return container.offer_obj.campaign_id;
  }

  /**
   * will return a set of all offers ids associated to a campaign, or null if no
   * campaign is found
   * @param  {[type]} campaignID [description]
   * @return {[type]}            [description]
   */
  getCampaignOffers(campaignID) {
    if (!campaignID) {
      return null;
    }
    return this.campaignToOffersMap[campaignID];
  }

  /**
   * this method will check on the given set of offers ids which is the offer
   * that was latest updated and still on the DB (i/e not removed).
   * @param  {[type]} offersIDsSet [description]
   * @return {list}              sorted list (by latest updated offer) of objects
   * with the following information:
   * {
   *   l_u_ts: ts,
   *   offer_id: offer id,
   *   campaign_id: cid,
   * }
   */
  getLatestUpdatedOffer(offersIDsSet) {
    if (!offersIDsSet) {
      return null;
    }

    const sortedOffers = [];
    const self = this;
    offersIDsSet.forEach((oid) => {
      const offerCont = self.offersIndexMap.get(oid);
      if (!offerCont || offerCont.removed === true || !offerCont.offer_obj) {
        return;
      }

      sortedOffers.push({
        offer_id: offerCont.offer_obj.offer_id,
        campaign_id: offerCont.offer_obj.campaign_id,
        last_update: offerCont.l_u_ts,
      });
    });
    // we will sort using the last update field and putting the latest update
    sortedOffers.sort((a, b) => b.last_update - a.last_update);

    return sortedOffers;
  }

  /**
   * will retrieve all the offers we have applying filters and also sorting given
   * on the options argument.
   * @param  {object} opt containing the filter and sorting options:
   * <pre>
   * {
   *   filter: {
   *     // the dest field will be used just to query all the offers that
   *     // belong to a particular destination (on the list).
   *     // If the offer destination field is on the list will be returned
   *     dest: ['dest1', ...]
   *   },
   *   // how we want to sort the list, for now will be the newest first, olders
   *   // at the end
   *   sort: 'c_ts' or 'l_u_ts',
   * }
   * </pre>
   * @return {[type]}     [description]
   */
  getOffers(includeRemoved = false) {
    // for now we will list all the current offers and return them in a list
    const offers = [];
    this.offersIndexMap.keys().forEach((offerID) => {
      const cont = this.offersIndexMap.get(offerID);
      // we add it if we have the offer object only
      if (cont.offer_obj && (includeRemoved === true || !cont.removed)) {
        const offerInfo = {
          offer_id: cont.offer_obj.offer_id,
          offer: cont.offer_obj,
          last_update: cont.l_u_ts,
          created: cont.c_ts,
          removed: cont.removed,
        };
        if (cont.offer_actions && cont.offer_actions.offer_ca_action) {
          offerInfo.click = cont.offer_actions.offer_ca_action.l_u_ts || 0;
        } else {
          offerInfo.click = 0;
        }
        if (cont.offer_actions && cont.offer_actions.offer_shown) {
          offerInfo.view = cont.offer_actions.offer_shown.l_u_ts || 0;
        } else {
          offerInfo.view = 0;
        }
        offers.push(offerInfo);
      }
    });

    return offers;
  }

  /**
   * Will return a list of offers and metadata associated to them from a set
   * of offers IDs,
   * @param  {Set} offerIDsSet Set containing the offers ids
   * @return {array}  of objects as follow:
   * {
   *   offer_id: X,
   *   offer: {...},
   *   removed: true / false,
   *   last_update: TS of last update.
   * }
   */
  getOffersFromIDs(offerIDsSet) {
    const result = [];
    offerIDsSet.forEach((offerID) => {
      const offerCont = this.offersIndexMap.get(offerID);
      if (offerCont && offerCont.offer_obj) {
        result.push({
          offer_id: offerID,
          offer: offerCont.offer_obj,
          removed: offerCont.removed,
          last_update: offerCont.l_u_ts,
        });
      }
    });
    return result;
  }

  /**
   * will return all the list of offers for a given client we have
   */
  getClientOffers(clientID) {
    return this.clientToOffersMap.has(clientID) ?
      this.clientToOffersMap.get(clientID) :
      null;
  }

  /**
   * This method will return all the offers ids we have (set) for a given
   * offer type. If none => null is returned
   */
  getOffersByType(type) {
    return this.typesToOffersMap.has(type) ?
      this.typesToOffersMap.get(type) :
      null;
  }

  // ---------------------------------------------------------------------------
  // The "private" methods will go here
  // ---------------------------------------------------------------------------

  /**
   * will return a basic container for every element we want to track: actions,
   * attributes, etc
   * @return {[type]} [description]
   * <pre>
   *   {
   *     c_ts: ts,
   *     l_u_ts: ts
   *   }
   * </pre>
   */
  _createElementContainer() {
    const now = timestampMS();
    return {
      c_ts: now,
      l_u_ts: now,
    };
  }

  /**
   * check validity of an offer
   * @param  {[type]}  offerID   [description]
   * @param  {[type]}  offerData [description]
   * @return {Boolean} true on success | false otherwise
   */
  _isOfferValid(offerID, offerData) {
    if (!offerID ||
        !offerData ||
        !offerData.offer_id ||
        offerData.offer_id !== offerID ||
        !offerData.display_id ||
        !offerData.campaign_id) {
      return false;
    }
    if (isOfferExpired(offerData)) {
      return false;
    }
    return true;
  }

  /**
   * will create a new container (metadata) for an offerID
   * @return {object} that should be inserted on the index.
   * <pre>
   * {
   *   c_ts: ts,
   *   l_u_ts: ts,
   *   offer_obj: null,
   *   offer_attrs: {},
   *   offer_actions: {}, // the "history signals",
   *   removed: false,  // if it was removed or not from DB
   * }
   * </pre>
   */
  _createOfferContainer() {
    const now = timestampMS();
    return {
      c_ts: now,
      l_u_ts: now,
      offer_obj: null,
      offer_attrs: {},
      offer_actions: {},
      removed: false,
    };
  }

  /**
   * will remove old entries from the main index
   * @return {[type]} [description]
   */
  _removeOldEntries() {
    const now = timestampMS();
    const expTimeMs = OffersConfigs.OFFERS_STORAGE_DEFAULT_TTS_SECS * 1000;
    const validDisplayIds = new Set();
    this.offersIndexMap.keys().forEach((offerID) => {
      const cont = this.offersIndexMap.get(offerID);
      // check delta
      const delta = now - cont.l_u_ts;
      if (delta >= expTimeMs) {
        // we need to remove this.
        logger.info(`_removeOldEntries: removing old offer ${offerID} with delta time: ${delta}`);
        this._removeIndexTablesForOffer(offerID);
        this.offersIndexMap.delete(offerID);
      } else {
        validDisplayIds.add(cont.offer_obj.display_id);
      }
    });

    // EX-7208: check if there are displayID elements that should not be here
    // which can happen if we port from old display-id to the new one
    this.displayIdIndexMap.keys().forEach((displayID) => {
      if (!validDisplayIds.has(displayID)) {
        // we need to remove this one
        this.displayIdIndexMap.delete(displayID);
      }
    });
  }

  /**
   * will add all the needed mappings on the tables for a particular offerID.
   * The offer should be added into the main index before calling this method.
   * @param  {[type]} offerID [description]
   * @return {[type]}         [description]
   */
  _updateIndexTablesForOffer(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`_updateIndexTablesForOffer: The offer id: ${offerID} is not stored`);
      return false;
    }
    const displayID = container.offer_obj.display_id;
    if (!this.displayIdIndexMap.has(displayID)) {
      this.displayIdIndexMap.set(displayID, {});
    }
    if (this.displayIDCounter[displayID]) {
      this.displayIDCounter[displayID] += 1;
    } else {
      this.displayIDCounter[displayID] = 1;
    }

    this._addOfferInCampaignMap(container.offer_obj);
    this._addOfferInClientMap(container.offer_obj);
    this._addOfferInTypeMap(container.offer_obj);

    return true;
  }

  _migrateDisplayID(oldDisplayID, newDisplayID) {
    logger.debug(`Migrating display id db information from ${oldDisplayID} to ${newDisplayID}`);
    if (!this.displayIdIndexMap.has(oldDisplayID)) {
      logger.debug('nothing to migrate');
      return;
    }
    // here we just reassing the data from old to new, since no offers are sharing the
    // same display id, otherwise we will need to decide what to merge
    this.displayIdIndexMap.set(newDisplayID, this.displayIdIndexMap.get(oldDisplayID));
    if (this.displayIDCounter[oldDisplayID]) {
      this.displayIDCounter[newDisplayID] = this.displayIDCounter[oldDisplayID];
    }
  }

  /**
   * remove entries on the maps (index tables) for a given offer (that should still
   * be on the DB main index).
   * @param  {[type]} offerID [description]
   * @return {[type]}         [description]
   */
  _removeIndexTablesForOffer(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`_removeIndexTablesForOffer: The offer id: ${offerID} is not stored`);
      return false;
    }
    const displayID = container.offer_obj.display_id;
    this.displayIDCounter[displayID] -= 1;
    if (this.displayIDCounter[displayID] <= 0) {
      // we need to remove this from the display_id_index
      this.displayIdIndexMap.delete(displayID);
    }
    this._removeOfferInCampaignMap(container.offer_obj);
    this._removeOfferInClientMap(container.offer_obj);
    this._removeOfferInTypeMap(container.offer_obj);

    return true;
  }

  /**
   * will build all the needed index tables here.
   * @return {[type]} [description]
   */
  _buildIndexTables() {
    this.offersIndexMap.keys().forEach(offerID => this._updateIndexTablesForOffer(offerID));
  }


  _addOfferInCampaignMap(offer) {
    if (!offer || !offer.offer_id || !offer.campaign_id) {
      return;
    }
    let cset = this.campaignToOffersMap[offer.campaign_id];
    if (!cset) {
      cset = new Set();
      this.campaignToOffersMap[offer.campaign_id] = cset;
    }
    cset.add(offer.offer_id);
  }

  _removeOfferInCampaignMap(offer) {
    const cset = this.campaignToOffersMap[offer.campaign_id];
    if (!cset) {
      return;
    }
    cset.delete(offer.offer_id);
  }

  _addOfferInClientMap(offer) {
    if (!offer || !offer.client_id) {
      return;
    }
    if (!this.clientToOffersMap.has(offer.client_id)) {
      this.clientToOffersMap.set(offer.client_id, new Set());
    }
    this.clientToOffersMap.get(offer.client_id).add(offer.offer_id);
  }

  _removeOfferInClientMap(offer) {
    if (this.clientToOffersMap.has(offer.client_id)) {
      this.clientToOffersMap.get(offer.client_id).delete(offer.offer_id);
    }
  }

  _addOfferInTypeMap(offer) {
    if (!offer.types || offer.types.length === 0) {
      return;
    }
    offer.types.forEach((ot) => {
      if (!this.typesToOffersMap.has(ot)) {
        this.typesToOffersMap.set(ot, new Set());
      }
      this.typesToOffersMap.get(ot).add(offer.offer_id);
    });
  }

  _removeOfferInTypeMap(offer) {
    if (!offer.types || offer.types.length === 0) {
      return;
    }
    offer.types.forEach((ot) => {
      if (this.typesToOffersMap.has(ot)) {
        this.typesToOffersMap.get(ot).delete(offer.offer_id);
      }
    });
  }

  _pushCallbackEvent(evt, offerContainer, extraData = undefined) {
    const msgToSend = {
      evt,
      offer: offerContainer.offer_obj,
      lastUpdateTS: offerContainer.l_u_ts,
    };
    if (extraData) {
      msgToSend.extraData = extraData;
    }
    this.callbacks.forEach(cb => cb(msgToSend));
  }

  _loadPersistentData() {
    if (!OffersConfigs.LOAD_OFFERS_STORAGE_DATA) {
      return Promise.resolve(true);
    }
    return Promise.all([
      this.offersIndexMap.init(),
      this.displayIdIndexMap.init(),
    ]).then(() =>
      // load old data if any, we will remove this code in the future updates
      this._portOldOffersIfAny().then(() => {
        // remove old entries
        this._removeOldEntries();

        // build tables
        this._buildIndexTables();

        // emit the event
        return Promise.resolve(true);
      })
    );
  }

  // ///////////////////////////////////////////////////////////////////////////
  // THIS CODE SHOULD BE REMOVED LATER
  // ///////////////////////////////////////////////////////////////////////////
  //

  /**
   * this method will port all the old DB into the new one
   * @return {[type]} [description]
   */
  _portOldOffersIfAny() {
    if (!this.tmpdb) {
      return Promise.resolve(true);
    }

    // we will define here the functions to perform on the DB that we used on the past
    const get = (db, docID) => db.get(docID).then(doc => (doc.doc_data)).catch(() => null);

    const remove = (db, docID) =>
      // https://pouchdb.com/api.html#delete_document
      db.get(docID)
        .then(doc => db.remove(doc))
        .catch((err) => {
          // nothing to do there
          if (err && err.status && err.status !== 404) {
            logger.error(`removing old offers-db ${docID} - err:`, err);
          } else {
            logger.log(`missing DB entry for docID ${docID}`);
          }
        });
    return get(this.tmpdb, STORAGE_DB_DOC_ID).then((docData) => {
      if (!docData || !docData.data_index) {
        return Promise.resolve(true);
      }
      // set the data
      const dataIndex = docData.data_index;
      Object.keys(dataIndex.offers_index).forEach((offerID) => {
        if (!this.offersIndexMap.has(offerID)) {
          this.offersIndexMap.set(offerID, dataIndex.offers_index[offerID]);
        }
      });
      Object.keys(dataIndex.display_id_index).forEach((displayID) => {
        if (!this.displayIdIndexMap.has(displayID)) {
          this.displayIdIndexMap.set(displayID, dataIndex.display_id_index[displayID]);
        }
      });


      // remove this entry from the DB
      return remove(this.tmpdb, STORAGE_DB_DOC_ID);
    }).catch(() => Promise.resolve(true));
  }
}

export default OfferDB;
