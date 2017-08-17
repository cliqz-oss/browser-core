

let ops = {};

/**
 * This operation will make an offer "active" into the system, basically, this will
 * call the offer processor module which is responsible to filter + show offers.
 * If the offer is not active it will be shown in the given real states.
 * @param  {string} url   the current url
 * @param  {object} offer  is the offer object itself
 * @return {void} nothing
 * @version 1.0
 */
function show_offer(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    var url = args[0];
    var offerInfo = args[1];

    offerInfo.rule_info["type"] = "exact_match";
    offerInfo.rule_info["url"] = [url];

    var env = eventLoop.environment;

    if(!env.isOfferActive(offerInfo.offer_id)) {
      env.addOffer(offerInfo);
    }
    else {
      env.displayOffer(offerInfo.offer_id, offerInfo.rule_info);
    }

    resolve();
  });
};

/**
 * Offer added is a method used to check if an offer was added (is active) or not
 * on the system in the last N seconds.
 * @param  {string} offerID The offer id we want to check
 * @param  {integer} secs The number of seconds
 * @return {boolean} true if the offer was "added" in the last secs seconds or false
 *                   otherwise
 * @version 1.0
 */
function offer_added(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    var offerId = args[0];
    var seconds = args[1];
    var env = eventLoop.environment;

    var signalTs = env.getOfferLastUpdate(offerId, "offer-added");

    var result = (signalTs > Date.now() - seconds * 1000);

    resolve(result);
  });
};


/**
 * This function will select an offer from a list of them, using a new parameter
 * to distinguish how much probability should have to be shown.
 * This is an AB test internal method.
 * The way it works is as follow:
 * Given a unique number generated on the client side once (ABNum) and a list of
 * N offers containing a percentage number POi (percentage for offer i), assuming
 * that SUM(POi) = 1 for i: 0,..,N, we:
 *  1) Filter all the offers that doesn't contain the POi (just in case to avoid error,
 *     even when this is actually an error).
 *  2) We normalize the percentages (just in case SUM(POi) != 1), basically dividing
 *     each of the POi with the SUM(POi).
 *  3) We generate ranges of the form [..,(PO(i-1) * 10000, 10000 * POi),..] and we
 *     check in which range ABNum is in (note 10000 is the max num of the ABNum).
 *  4) After selecting that offer we show it as usual.
 * @param {string} url is the url that we want to
 * @param {list} offerList is the list of offers with their given percentage
 * @version 1.0
 */
function show_ab_offer(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    let url = args[0];
    let offersList = args[1];

    if (!offersList || offersList.length === 0) {
      reject(new Error('invalid args, no offers list?'));
      return;
    }

    const opName = 'show_ab_offer';
    var env = eventLoop.environment;

    // get the percentages of possibilities of each of the offers, if some of them
    // has not then we stop here.
    let percentages = {};
    let totalPct = 0.0;
    let index = -1;

    offersList.forEach(function(offerObj) {
      index += 1;
      if (!offerObj.ab_test_info || !offerObj.ab_test_info.pct) {
        return;
      }
      // we consider this
      const percentage = Number(offerObj.ab_test_info.pct);
      totalPct += percentage;
      percentages[index] = percentage;
    });

    if (totalPct <= 0) {
      reject(new Error('we couldnt calculate the percentage of all the offers on the AB test group'));
      return;
    }

    // normalize just in case
    Object.keys(percentages).forEach(index => {
      percentages[index] = percentages[index] / totalPct;
    });

    // get the number and see in which range it is
    let accumPct = 0;
    let selectedOffer = null;
    const abNum = env.getABNumber();
    Object.keys(percentages).forEach(index => {
      if (selectedOffer) {
        return;
      }
      accumPct += percentages[index];
      const normNum = accumPct * 10000;
      if (abNum <= normNum) {
        // this is the selected one
        selectedOffer = offersList[index];
      }
    });

    // if there is no selected offer something very bad happened?
    if (!selectedOffer) {
      reject(new Error('we couldnt select any offer.. this is not right'));
      return;
    }

    // continue with the normal flow
    selectedOffer.rule_info["type"] = "exact_match";
    selectedOffer.rule_info["url"] = [url];


    if(!env.isOfferActive(selectedOffer.offer_id)) {
      env.addOffer(selectedOffer);
    } else {
      env.displayOffer(selectedOffer.offer_id, selectedOffer.rule_info);
    }
    resolve();
  });
};

// define all the methods here
ops['$show_offer'] = show_offer;
ops['$offer_added'] = offer_added;
ops['$show_ab_offer'] = show_ab_offer;

export default ops;

