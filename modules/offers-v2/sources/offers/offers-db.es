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
import { ImageDownloaderForOfferDB } from './image-downloader';
import { OfferMatchTraits } from '../categories/category-match';

/**
 * The class OfferDB wraps a persistent collections of
 * - offers to display, and
 * - statistics (signals) for these offers.
 *
 * "Persistent" means that the collection survives browser restart.
 * We store the collection in "indexed DB" browser store under the keys
 * "chrome/offers-db-index" and "chrome/offers-db-display-index".
 * Use Browser Toolbox to review the collection.
 *
 * "Offers to display" means that an offer has passed the filters and
 * one or another real estate should display it unconditionally.
 *
 * Changes in the collection propagate to registered callbacks:
 * {
 *   evt: 'event',
 *   offer: {}
 * }
 * evt types:
 * - 'offer-added'
 * - 'offer-updated'
 * - 'offer-action'
 * - 'offer-removed'
 *
 * Issues
 *
 * OfferDB must be a singleton object.
 *
 * OfferDB relies on external code to manage what should be in the
 * collection. In particular, OfferDB doesn't care if an offer should
 * disappear.
 *
 * @class OfferDB
 */
class OfferDB {
  /**
   * Asynchronously load the persistent collection and index it.
   */
  constructor({ imageDownloader = new ImageDownloaderForOfferDB() } = {}) {
    this.imageDownloader = imageDownloader;

    this.offersIndexMap = buildCachedMap('offers-db-index', OffersConfigs.LOAD_OFFERS_STORAGE_DATA);
    this.displayIdIndexMap = buildCachedMap('offers-db-display-index', OffersConfigs.LOAD_OFFERS_STORAGE_DATA);

    // temporary mapping counter to know when to remove a display or not
    this.displayIDCounter = {};

    // we will dynamically keep track of which offers are related to a particular
    // campaign id: campaign_id -> Set(offersIDs)
    this.campaignToOffersMap = {};

    // callbacks list
    this.callbacks = new Map();

    // Caller should call `loadPersistentData` to finish initialization
  }

  loadPersistentData() {
    if (!OffersConfigs.LOAD_OFFERS_STORAGE_DATA) {
      return Promise.resolve(true);
    }
    return Promise
      .all([
        this.offersIndexMap.init(),
        this.displayIdIndexMap.init(),
      ])
      .then(() => {
        this._buildIndexTables();
      });
  }

  registerCallback(cb) {
    this.callbacks.set(cb, cb);
  }

  unregisterCallback(cb) {
    this.callbacks.delete(cb);
  }

  // ---------------------------------------------------------------------------
  // The public methods will go here
  // ---------------------------------------------------------------------------

  /**
   * will return the metadata for a particular offer or null if not exists
   *
   * @method getOfferMeta
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
   *
   * @method addOfferObject
   * @param {string} offerID
   * @param {BackendOffer} offerData [description]
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
   *
   * @method removeOfferObject
   * @param  {string} offerID
   * @return {boolean} true on success false otherwise
   */
  removeOfferObject(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      logger.warn(`removeOfferObject: The offer id: ${offerID} is not stored`);
      return false;
    }

    // we should not remove this since we rely still on accessing the display_id
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
   *
   * @method eraseOfferObject
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
   *
   * @method getOfferObject
   * @param  {string} offerID
   * @return {BackendOffer}
   */
  getOfferObject(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return null;
    }
    return container.offer_obj;
  }

  getOfferTemplateData(offerID) {
    const { offer_obj: offerObject = {} } = this.offersIndexMap.get(offerID) || {};
    const { ui_info: { template_data: templateData = {} } = {} } = offerObject;
    return templateData;
  }

  /**
   * will check if there is information about the offer or not
   *
   * @method hasOfferData
   * @param  {string}  offerID
   * @return {Boolean}         true if there are or false otherwise
   */
  hasOfferData(offerID) {
    return this.offersIndexMap.has(offerID);
  }

  /**
   * More strong statement than `hasOfferData`. Who will touch the code
   * that uses a has-function, please describe the difference.
   *
   * @method hasOfferObject
   * @param offerID
   * @returns {boolean}
   */
  hasOfferObject(offerID) {
    if (this.getOfferObject(offerID)) {
      return true;
    }
    return false;
  }

  /**
   * Check logical presence of an offer.
   * For accounting reasons, removed offers are not really removed.
   *
   * @method isOfferPresent
   * @param offerID
   * @returns {boolean}
   */
  isOfferPresent(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return false;
    }
    return !container.removed;
  }

  /**
   * will update an offer object.
   *
   * @method updateOfferObject
   * @param  {string} offerID
   * @param  {BackendOffer} offerData
   * @param {boolean} retainAbTestInfo  Used and explained in
   *   offers/jobs/db-replacer.es, search by EX-7894
   * @return {boolean} true on success | false otherwise
   *
   * If the offer was removed before, it becomes present again.
   */
  updateOfferObject(offerID, offerData, retainAbTestInfo = false) {
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

    let origAbTestInfo;
    if (container.offer_obj) {
      // check if we have an old object here
      const localOffer = container.offer_obj;
      if (offerData.offer_id !== localOffer.offer_id
          || offerData.campaign_id !== localOffer.campaign_id) {
        logger.warn('updateOfferObject: the offer core data is not similar? not supported for now');
        return false;
      }

      origAbTestInfo = localOffer.abTestInfo;

      // we need to check if it is necessary to migrate the values of the
      // old display id to the new if they have different ones
      if (offerData.display_id !== localOffer.display_id) {
        // migrate old to new
        this._migrateDisplayID(localOffer.display_id, offerData.display_id);
      }
    }
    // it is ok, we update the data
    container.offer_obj = JSON.parse(JSON.stringify(offerData));
    if (retainAbTestInfo) {
      const o1 = container.offer_obj.abTestInfo || {};
      const o2 = origAbTestInfo || {};
      if ((o1.start !== o2.start) || (o1.end !== o2.end)) {
        logger.info(`updateOfferObject: retain abTestInfo for offer "${offerID}":`,
          origAbTestInfo, ', reject:', o1);
        container.offer_obj.abTestInfo = origAbTestInfo;
      }
    }
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
   * Reverse of `isOfferPresent`.
   *
   * @method hasOfferRemoved
   * @param {string} offerID
   * @return {boolean}
   */
  hasOfferRemoved(offerID) {
    const container = this.offersIndexMap.get(offerID);
    if (!container) {
      return false;
    }
    return container.removed;
  }

  /**
   * this method will increment +1 a particular action for a given offer.
   * This will also update if needed the display ID
   *
   * @method incOfferAction
   * @param  {string} offerID
   * @param  {string} actionID
   *   Some possible values: `offer_shown`, `offer_pushed`, `offer_notif_popup`,
   *   `offer_dsp_session`, `offer_added`, `filter_exp__*`
   * @param  {boolean} incDisplay
   *   if true this will also increment the signal in the display map.
   * @param {number} count
   *   Increment value, default is 1
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

    if (!actionID.startsWith('filtered_by')) { container.l_u_ts = now; }
    this.offersIndexMap.set(offerID, container);

    // propagate event
    this._pushCallbackEvent('offer-action', container, { actionID });

    return true;
  }

  /**
   * will return the metadata for a particular actionID and offerID.
   *
   * @method getOfferActionMeta
   * @param  {string} offerID
   * @param  {string} actionID
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
   *
   * @method addOfferAttribute
   * @param {string} offerID
   * @param {string} attrID
   * @param {any} data
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
   * will return the associated attribute for the given offer and attrID,
   * null if not exists
   *
   * @method getOfferAttribute
   * @param  {string} offerID
   * @param  {string} attrID
   * @return {any}
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
   * Store information why the offer is in the database.
   *
   * @method addReasonForHaving
   * @param {string} }offerID
   * @param {OfferMatchTraits} reason
   * @returns {boolean} true on success
   */
  addReasonForHaving(offerID, reason) {
    return this.addOfferAttribute(offerID, 'reason', reason && reason.toStorage());
  }

  /**
   * Explain why the offer was stored in the database.
   *
   * @method getReasonForHaving
   * @param {string} offerID
   * @returns {OfferMatchTraits}
   */
  getReasonForHaving(offerID) {
    const reasonObj = this.getOfferAttribute(offerID, 'reason');
    return OfferMatchTraits.fromStorage(reasonObj);
  }

  /**
   * will return the metadata of a display id for a particular actionID and displayID.
   *
   * @method getOfferisplayActionMera
   * @param  {string} displayID
   * @param  {string} actionID
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
   *
   * @method getCampaignID
   * @param  {string} offerID
   * @return {string}
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
   *
   * @method getCampaignOffers
   * @param  {string} campaignID
   * @return {string}
   */
  getCampaignOffers(campaignID) {
    if (!campaignID) {
      return null;
    }
    return this.campaignToOffersMap[campaignID];
  }

  /**
   * @method hasAnotherOfferOfSameCampaign
   * @param {Offer} offer
   *   An Offer object is used instead of offerID because we need
   *   campaignID, which we don't have in the database for yet unseen offers.
   * @return {boolean}
   */
  hasAnotherOfferOfSameCampaign(offer) {
    const offerID = offer.uniqueID;
    const campaignID = offer.campaignID;
    const campaignOffers = this.getCampaignOffers(campaignID);
    return campaignOffers
      ? [...campaignOffers].some(id => offerID !== id)
      : false;
  }

  /**
   * this method will check on the given set of offers ids which is the offer
   * that was latest updated and still on the DB (i/e not removed).
   *
   * @method getLatestUpdatedOffer
   * @param  {string_set} offersIDsSet
   * @return {string_arr} sorted list (by latest updated offer) of objects
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
   * will retrieve all the offers we have
   *
   * Downloading offer images:
   *
   * - Offer images should have been downloaded before offer-push.
   *   An offer without images in OfferDB is an error path.
   * - Image is already successfully downloaded if `dataurl` field
   *   is indeed encoded as data url.
   * - Otherwise, there was an error downloading image, and then
   *   the field contains FALLBACK_IMAGE (from `image-downloader.es`)
   * - In transition between extension versions, the field can be empty.
   *   For the first moment, the image downloader uses `url` as a fallback
   *   and then starts to download the image.
   *
   * @method getOffers
   * @param {boolean} includeRemoved
   * @return {OfferInfo}
   */
  getOffers(includeRemoved = false) {
    // for now we will list all the current offers and return them in a list
    const offers = [];
    this.offersIndexMap.keys().forEach((offerID) => {
      const cont = this.offersIndexMap.get(offerID);
      // we add it if we have the offer object only
      if (cont.offer_obj && (includeRemoved === true || !cont.removed)) {
        // sync fill `dataurl` fields with an image or fallback
        // async download an image and update `dataurl` fields
        const tpl = cont.offer_obj.ui_info.template_data;
        if (tpl) { // Quicksearch offers are stored without `template_data`
          this.imageDownloader.download(
            tpl.logo_url,
            tpl.logo_dataurl,
            (dataurl) => { tpl.logo_dataurl = dataurl; }
          );
          this.imageDownloader.download(
            tpl.picture_url,
            tpl.picture_dataurl,
            (dataurl) => { tpl.picture_dataurl = dataurl; }
          );
        }
        //
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
    this.imageDownloader.markBatch();

    return offers;
  }

  /**
   * Will return a list of offers and metadata associated to them from a set
   * of offers IDs,
   *
   * @method getOffersFromIDs
   * @param  {string_set} offerIDsSet
   * @return {array}  of objects as follow:
   * {
   *   offer_id: X,
   *   offer: {...}, // type BackendOffer
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
   * @method getPushCount
   * @param offerID
   * @returns {number}
   * For unknown offers, return zero.
   */
  getPushCount(offerID) {
    const meta = this.getOfferActionMeta(offerID, 'offer_pushed');
    return meta && meta.count ? meta.count : 0;
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
    if (!offerID
        || !offerData
        || !offerData.offer_id
        || offerData.offer_id !== offerID
        || !offerData.display_id
        || !offerData.campaign_id) {
      return false;
    }
    return !this._isOfferExpired(offerData);
  }

  _isOfferExpired(offerData) {
    // Only return true when `validity` is provided
    try {
      return offerData.ui_info.template_data.validity < Date.now() / 1000;
    } catch (e) {
      if (!(
        offerData
        && offerData.rs_dest
        && offerData.rs_dest.includes
        && offerData.rs_dest.includes('dropdown')
      )) {
        logger.warn('Missing "validity" field', offerData);
      }
      return false;
    }
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
}

export default OfferDB;
