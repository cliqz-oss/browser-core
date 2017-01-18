

var ops = {};
export default ops;



ops['$history'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var ts = timestamp();

    resolve(eventLoop.environments.queryHistory(ts - args[0], ts - args[1]));
  });
};


ops['$count_sessions'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 4) {
      reject(new Error('invalid args'));
    }

    var start = args[0];
    var end = args[1];
    var ttl = args[2];
    var patterns = args[3];

    var compiledPatterns = [];
    patterns.forEach(function(pattern) {
      compiledPatterns.push(new RegExp(pattern));
    });

    var ts = timestamp();
    var lastMatchTimestamp = 0;
    var numSessions = 0;
    var history = eventLoop.environment.queryHistory(ts - args[0], ts - args[1]);
    history.forEach(function(entry) {
      compiledPatterns.forEach(function(pattern) {
        if(pattern.exec(entry.url)) {
          if(entry.timestamp - lastMatchTimestamp > ttl) {
            numSessions++;
          }
          lastMatchTimestamp = entry.timestamp;
        }
      });
    });

    resolve(numSessions);
  });
};


ops['$active_since'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 1) {
      reject(new Error('invalid args'));
    }

    var ts = timestamp();
    var history = eventLoop.environment.queryHistory(ts - args[0], ts);

    resolve(history.length > 0);
  });
};


function timestamp() {
  return Math.round(Date.now() / 1000);
}
