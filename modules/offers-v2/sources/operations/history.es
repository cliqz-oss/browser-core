

let ops = {};


/**
 * Will check in the history if there is any matching against a list of regular
 * expresions.
 * At the same time if there is will add the current url to the history.
 * We will analyze all the urls in a range of time (timestamps in seconds) [start, end]
 * @param  {Number} start   the start timestamp on seconds
 * @param  {Number} end     the end time timestamp on seconds
 * @param  {list} patterns  The list if patterns to check against (string regex)
 * @return {Number} the number of matches we have.
 * @todo We will make this deprecate soon after integrating the new regex algorithm.
 * @version 1.0
 */
function match_history(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
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

/**
 * @deprecated this will be deprecated soon
 * Will count the number of sessions on the history that a list of patterns matched
 * in a range of time (timestamps in seconds) [start, end]
 * @param  {Number} start   the start timestamp on seconds
 * @param  {Number} end     the end time timestamp on seconds
 * @param  {Number} ttl     ttl?
 * @param  {list} patterns  The list if patterns to check against (string regex)
 * @return {Number} the number of matches we have.
 * @version 1.0
 */
function count_history_sessions(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 4) {
      reject(new Error('invalid args'));
      return;
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


ops['$match_history'] = match_history;
ops['$count_history_sessions'] = count_history_sessions;

export default ops;
