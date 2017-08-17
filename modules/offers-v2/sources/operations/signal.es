

let ops = {};

/**
 * send a signal to the BE, always associated to an offer.
 * @param  {String} offerID The associated offer ID
 * @param  {String} actionID Is the signal name (key) to be sent
 * @version 1.0
 */
function send_signal(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    var offerID = args[0];
    var key = args[1];

    // if we do not have an offer already here then we will not create anything
    // here.
    if (!eventLoop.environment.isOfferPresent(offerID)) {
      resolve();
      return;
    }

    // TODO: we don't need anymore the campaignID for sending a signal
    // remove it and remove it from the documentation as well.
    eventLoop.environment.sendSignal(offerID, key);

    resolve();
  });
};


ops['$send_signal'] = send_signal;

export default ops;
