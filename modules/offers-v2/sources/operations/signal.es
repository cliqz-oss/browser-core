

var ops = {};
export default ops;


ops['$send_signal'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 3) {
      reject(new Error('invalid args'));
      return;
    }

    var offerId = args[0];
    var key = args[1];
    var capmaignId = args[2];

    eventLoop.environment.sendSignal(capmaignId, offerId, key);

    resolve();
  });
};
