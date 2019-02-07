/**
 * Helper monitoring methods
 */

import { timestampMS } from '../../utils';

// /////////////////////////////////////////////////////////////////////////////

/**
 * This method will check all the offers associated to the campaign and will
 * return the latest offer (id) updated and the campaign id of th one or null if none
 * { oid: offer_id, cid: campaignID }
 */
const getLatestUpdatedOfferFromCampaign = (offerID, offersDB) => {
  const campaignID = offersDB.getCampaignID(offerID);
  const campaignOffers = offersDB.getCampaignOffers(campaignID);
  if (!campaignOffers) {
    return null;
  }

  const latestUpdatedOffers = offersDB.getLatestUpdatedOffer(campaignOffers);
  if (!latestUpdatedOffers
      || latestUpdatedOffers.length <= 0
      || !latestUpdatedOffers[0].offer_id) {
    return null;
  }
  return { oid: latestUpdatedOffers[0].offer_id, cid: campaignID };
};

const sendSignal = (offersDB, sigHandler, offerId, key) => {
  if (!offerId || !key || !offersDB) {
    return false;
  }

  // get the campaign id for this offer if we have one.
  const campaignId = offersDB.getCampaignID(offerId);
  if (!campaignId) {
    return false;
  }

  // send the signal associated to the campaign using the origin trigger
  const originID = 'trigger';
  return sigHandler.setCampaignSignal(campaignId, offerId, originID, key);
};


/**
 * This method will send the associated signal given the
 * @param monitor The Offer monitor containing all the information we need
 * @param handlers An object containing the:
 *        - sigHandler to send the signals
 *        - offersDB to access the offers
 *        - lastCampaignSignalDB for persistent data
 *        - urlSignalDB
 * @param offersDB Get the associated
 */
export default function sendMonitorSignal(monitor, handlers, urlData) {
  const currentOfferID = monitor.offerID;
  const latestUpdatedOfferResult = getLatestUpdatedOfferFromCampaign(
    currentOfferID,
    handlers.offersDB
  );
  if (!latestUpdatedOfferResult) {
    // nothing to do here
    return false;
  }
  const offerIDToUse = latestUpdatedOfferResult.oid;
  const campaignID = latestUpdatedOfferResult.cid;

  // check if we have monitor.params as arguments
  let sigToSend = monitor.signalID;
  let shouldFilterSignal = false;
  if (monitor.params) {
    const currUrl = urlData.getNormalizedUrl();
    if (monitor.params.store && currUrl) {
      // we need to check on the DB the current url
      const sendSignalDb = handlers.urlSignalDB;
      const urlEntryCont = sendSignalDb.getEntryContainer(currUrl);
      if (urlEntryCont) {
        // we need to increment the counter
        urlEntryCont.data.counter += 1;
        // update the key
        sigToSend = `repeated_${monitor.signalID}`;
      } else {
        sendSignalDb.setEntryData(currUrl, { counter: 1 });
      }
    }

    if (monitor.params.filter_last_secs && monitor.params.filter_last_secs > 0) {
      const lastCmpSignalDB = handlers.lastCampaignSignalDB;
      let campaignMap = lastCmpSignalDB.getEntryData(campaignID);
      let lastUpdateTS = null;
      const now = timestampMS();
      if (!campaignMap) {
        // we need to create one
        campaignMap = {
          [monitor.signalID]: {
            counter: 1,
            l_u_ts: now
          }
        };
      } else {
        const keyMap = campaignMap[monitor.signalID];
        if (!keyMap) {
          campaignMap[monitor.signalID] = { counter: 1, l_u_ts: now };
        } else {
          campaignMap[monitor.signalID].counter += 1;
          lastUpdateTS = keyMap.l_u_ts;
          keyMap.l_u_ts = now;
        }
      }
      lastCmpSignalDB.setEntryData(campaignID, campaignMap);

      // check last update if we have it
      const deltaTime = (now - lastUpdateTS) / 1000;
      if (lastUpdateTS && (deltaTime <= monitor.params.filter_last_secs)) {
        shouldFilterSignal = true;
      }
    }
  }

  // check if we need to filter the signal or not
  let result = true;
  if (!shouldFilterSignal) {
    result = sendSignal(
      handlers.offersDB,
      handlers.sigHandler,
      offerIDToUse,
      sigToSend,
    );
  }

  return result;
}
