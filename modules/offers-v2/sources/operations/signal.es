const ops = {};

/**
 * send a signal to the BE, always associated to an offer. The offer will not be
 * the one provided on the arguments but we will get the latest offer active
 * for the given campaign:
 * offersIDs = offersForCampaign(campaignIDFromOffer(offer_id))
 * offerIDToUse = getLatestUpdatedOffer(offersIDs)
 * @param  {String} offerID The associated offer ID
 * @param  {String} actionID Is the signal name (key) to be sent
 * @param  {String} campaign id (@deprecated since it will not be used)
 * @param  {Object} will be a dictionary (object) with the following structure
 * <pre>
 * {
 *   // will be used to store the url where the signal will be sent getting it
 *   // from the context (current url). If the store is true and the url is on
 *   // the DB then we will change the signal name to repeated_ + signal_name.
 *   // On store == true we will also store the current url if not added before
 *   // If store == false we will not do anything described above.
 *   store: true / false,
 *
 *   // this parameter will be used (if present) to check when was the last signal
 *   // with the same name for the same campaign associated, and if exists we will
 *   // check the delta time from now to the last time we sent this signal.
 *   // in that case we will filter every signal that happened in that period of time
 *   // (now - last_signal_ts).
 *   // if this field is null or <= 0 nothing will be checked / filtered.
 *   filter_last_secs: N
 * }
 * </pre>
 * @version 2.0
 */
function sendSignal(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if (args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    const offerID = args[0];
    const key = args[1];
    // const dummyCampaignID = args[2];
    const options = args[3];

    // if we do not have an offer already here then we will not create anything
    // here.
    if (!eventLoop.environment.isOfferPresent(offerID) || !key) {
      resolve(false);
      return;
    }

    // EX-5017: store the action signal on the offer as well.
    // We will comment this line and fix it later on 1.19 since this will break
    // another behavior that is more important than this one. If we update the action
    // here on the offer db then when we get the latest offer that was updated
    // will be always this one.
    // We need to add a filter on db (extra argument) to avoid updating the latest
    // status of the offer for particular actions (silent actions).
    //
    // eventLoop.environment.incOfferAction(offerID, key);

    // we should get the associated offers for the current campaign id
    const campaignID = eventLoop.environment.getCampaignID(offerID);
    if (!campaignID) {
      resolve(false);
      return;
    }

    const campaignOffers = eventLoop.environment.getCampaignOffers(campaignID);
    if (!campaignOffers) {
      resolve(false);
      return;
    }

    const latestUpdatedOffers = eventLoop.environment.getLatestUpdatedOffer(campaignOffers);
    if (!latestUpdatedOffers ||
        latestUpdatedOffers.length <= 0 ||
        !latestUpdatedOffers[0].offer_id) {
      resolve(false);
      return;
    }

    // we now get the latest updated offer that will be used to sent the signal
    const offerIDToUse = latestUpdatedOffers[0].offer_id;


    // check if we have options as arguments
    let sigToSend = key;
    let shouldFilterSignal = false;
    let referrerCat = null;
    if (options) {
      const currUrl = context['#url'];
      if (options.store && currUrl) {
        if (!eventLoop.urlSignalsDB) {
          reject(new Error('we dont have the urlSignalsDB?'));
          return;
        }
        // we need to check on the DB the current url
        const sendSignalDb = eventLoop.urlSignalsDB;
        const urlEntryCont = sendSignalDb.getEntryContainer(currUrl);
        if (urlEntryCont) {
          // we need to increment the counter
          urlEntryCont.data.counter += 1;
          // update the key
          sigToSend = `repeated_${key}`;
        } else {
          sendSignalDb.setEntryData(currUrl, { counter: 1 });
        }
      }

      if (options.filter_last_secs && options.filter_last_secs > 0) {
        if (!eventLoop.lastCampaignSignalDB) {
          reject(new Error('we dont have the lastCampaignSignalDB?'));
          return;
        }
        const lastCmpSignalDB = eventLoop.lastCampaignSignalDB;
        let campaignMap = lastCmpSignalDB.getEntryData(campaignID);
        let lastUpdateTS = null;
        const now = eventLoop.environment.timestampMS();
        if (!campaignMap) {
          // we need to create one
          campaignMap = {
            [key]: {
              counter: 1,
              l_u_ts: now
            }
          };
        } else {
          const keyMap = campaignMap[key];
          if (!keyMap) {
            campaignMap[key] = { counter: 1, l_u_ts: now };
          } else {
            campaignMap[key].counter += 1;
            lastUpdateTS = keyMap.l_u_ts;
            keyMap.l_u_ts = now;
          }
        }
        lastCmpSignalDB.setEntryData(campaignID, campaignMap);

        // check last update if we have it
        const deltaTime = (now - lastUpdateTS) / 1000;
        if (lastUpdateTS && (deltaTime <= options.filter_last_secs)) {
          shouldFilterSignal = true;
        }
      }

      if (options.referrer_cat) {
        // we get the referrer cat
        referrerCat = eventLoop.environment.getReferrerCat(context['#referrer']);
        if (referrerCat) {
          referrerCat = `ref_${referrerCat}`;
        }
      }
    }

    // check if we need to filter the signal or not
    if (!shouldFilterSignal) {
      eventLoop.environment.sendSignal(offerIDToUse, sigToSend, referrerCat);
    }

    resolve(true);
  });
}


ops.$send_signal = sendSignal;

export default ops;
