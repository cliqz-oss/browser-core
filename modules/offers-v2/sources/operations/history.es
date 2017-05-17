

var ops = {};
export default ops;


ops['$match_history'] = function(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var ts = timestamp();

    var start = args.shift();
    var end = args.shift();
    var patterns = args;

    var numMatches = 0;

    var history = eventLoop.historyIndex.queryHistory(ts - start, ts - end);
    history.forEach(function(entry) {
      for(var i = 0; i < patterns.length; i++) {
        var re = eventLoop.regexpCache.getRegexp(patterns[i]);
        if(re.exec(entry.url)) {
          numMatches++;
          break;
        }
      }
    });

    // add current url to history, if it matches same patterns
    for(var i = 0; i < patterns.length; i++) {
      var re = eventLoop.regexpCache.getRegexp(patterns[i]);
      if(re.exec(context['#url'])) {
        eventLoop.historyIndex.addUrl(context['#url'], context);
        break;
      }
    }

    resolve(numMatches);
  });
};


ops['$count_history_sessions'] = function(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 4) {
      reject(new Error('invalid args'));
    }

    var start = args[0];
    var end = args[1];
    var ttl = args[2];
    var patterns = args[3];

    var ts = timestamp();
    var lastMatchTimestamp = 0;
    var numSessions = 0;
    var history = eventLoop.historyIndex.queryHistory(ts - start, ts - end);
    history.forEach(function(entry) {
      for(var i = 0; i < patterns.length; i++) {
        var re = eventLoop.regexpCache.getRegexp(patterns[i]);
        if(re.exec(entry.url)) {
          if(entry.timestamp - lastMatchTimestamp > ttl) {
            numSessions++;
          }
          lastMatchTimestamp = entry.ts;
          break;
        }
      }
    });

    // add current url to history, if it matches same patterns
    for(var i = 0; i < patterns.length; i++) {
      var re = eventLoop.regexpCache.getRegexp(patterns[i]);
      if(re.exec(context['#url'])) {
        eventLoop.historyIndex.addUrl(context['#url'], context);
        break;
      }
    }

    resolve(numSessions);
  });
};


function timestamp() {
  return Math.round(Date.now() / 1000);
}
