

var ops = {};
export default ops;


ops['$show_offer'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var url = args[0];
    var offerInfo = args[1];

    offerInfo.rule_info["type"] = "exact_match";
    offerInfo.rule_info["url"] = [url];

    var env = eventLoop.environment;

    if(!env.hasOffer(offerInfo.offer_id)) {
      env.addOffer(offerInfo);
    }
    else {
      env.addRuleInfoForOffer(offerInfo.offer_id, offerInfo.rule_info);
    }

    resolve();
  });
};



ops['$offer_added'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var offerId = args[0];
    var seconds = args[1];
    var env = eventLoop.environment;

    var signalTs = env.getOfferLastUpdate(offerId, "offer-added");

    var result = (signalTs > Date.now() - seconds * 1000);

    resolve(result);
  });
};
