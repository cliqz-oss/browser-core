

var ops = {};
export default ops;


ops['$send_signal'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var signalId = args[0];
    var key = args[1];

    eventLoop.environment.sendSignal(signalId, key);

    resolve();
  });
};
