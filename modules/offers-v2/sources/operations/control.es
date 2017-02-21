

var ops = {};
export default ops;


ops['$log'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 1) {
      reject(new Error('invalid args'));
    }

    eventLoop.environment.info("Trigger", args[0]);
    resolve();
  });
};

ops['$and'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var result = true;
    args.forEach(arg => {
      result = result && arg;
    });

    resolve(result);
  });
};

ops['$or'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var result = false;
    args.forEach(arg => {
      result = result || arg;
    });

    resolve(result);
  });
};


ops['$not'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 1) {
      reject(new Error('invalid args'));
    }

    resolve(!args[0]);
  });
};


ops['$eq'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    resolve(args[0] === args[1]);
  });
};


ops['$gt'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    resolve(args[0] > args[1]);
  });
};


ops['$lt'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    resolve(args[0] < args[1]);
  });
};


ops['$match'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var text = args.shift();
    var patterns = args;

    for(var i = 0; i < patterns.length; i++) {
      var re = eventLoop.regexpCache.getRegexp(patterns[i])

      if(re.exec(text)) {
        resolve(true);
        return;
      }
    }

    resolve(false);
  });
};


ops['$match_url'] = function(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var patterns = args;

    for(var i = 0; i < patterns.length; i++) {
      var re = eventLoop.regexpCache.getRegexp(patterns[i])

      if(re.exec(context['#url'])) {
        eventLoop.historyIndex.addUrl(context['#url'], context);
        resolve(true);
        return;
      }
    }

    resolve(false);
  });
};


ops['$prop'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var obj = args[0];
    var key = args[1];

    resolve(args[0][key]);
  });
};


ops['$prop_array'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var key = args[1];

    var result = [];
    args[0].forEach(obj => {
      if(obj && typeof obj === 'object') {
        result.push(obj[key])
      }
    });

    resolve(result);
  });
};


ops['$timestamp'] = function(args) {
  return new Promise((resolve, reject) => {
    resolve(Date.now());
  });
};


ops['$day_hour'] = function(args) {
  return new Promise((resolve, reject) => {
    resolve(new Date().getHours());
  });
};


ops['$week_day'] = function(args) {
  return new Promise((resolve, reject) => {
    resolve(new Date().getDay() + 1);
  });
};


ops['$month_day'] = function(args) {
  return new Promise((resolve, reject) => {
    resolve(new Date().getDate());
  });
};
