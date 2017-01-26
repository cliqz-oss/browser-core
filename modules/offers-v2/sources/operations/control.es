

var ops = {};
export default ops;

var compiledRegexp = {};
var compiledRegexpCount = 0;

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

ops['$match'] = function(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
    }

    var text = args.shift();

    var regexp = [];
    args.forEach(function(arg) {
      var re = compiledRegexp[arg];
      if(!re) {
        re = new RegExp(arg);
        if(compiledRegexpCount++ < 250) {
          compiledRegexp[arg] = re;
          compiledRegexpCount++;
        }
      }

      regexp.push(re);
    });

    for(var i = 0; i < regexp.length; i++) {
      if(regexp[i].exec(text)) {
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
