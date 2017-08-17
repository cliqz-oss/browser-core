

let ops = {};

/**
 * This operation checks whether a particular pref is enabled or not.
 * @param {object} eventLoop
 * @param {list} args is a list of strings containing the pref as
 * first element and the expected value as second argument.
 * @return {boolean} String(getPref(args[0])) === String(args[1])
 * @version 1.0
 */
function if_pref(args,eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2){
      reject(new Error('invalid args'));
      return;
    }

    var pref_val = eventLoop.environment.getPref(args[0],undefined);

    resolve(String(pref_val) === String(args[1]));
  });
};

/**
 * Prints a message on the console
 * @param  {String} msg      the message to print on the console
 * @version 1.0
 */
function log(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 1) {
      reject(new Error('invalid args'));
      return;
    }

    eventLoop.environment.info("Trigger", args[0]);
    resolve();
  });
};

/**
 * Do a AND logic operation between the list of arguments
 * @param  {list} args is the list of arguments we want to perform the AND. It will
 *                     perform the AND between all of them.
 * @return {Boolean}      true if all args return true, false otherwise
 * @version 1.0
 */
function and(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    var result = true;
    args.forEach(arg => {
      result = result && arg;
    });

    resolve(result);
  });
};

/**
 * Perform a OR logic operation over all the arguments provided
 * @param  {list} args the list of arguments we want to apply the OR operation.
 * @return {Boolean}      true if any of the args is true, false otherwise
 * @version 1.0
 */
function or(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    var result = false;
    args.forEach(arg => {
      result = result || arg;
    });

    resolve(result);
  });
};

/**
 * Negates (boolean) a particular argument
 * @param  {Boolean} arg the boolean value we want to negate.
 * @return {Boolean} the negated value of arg.
 * @version 1.0
 */
function not(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 1) {
      reject(new Error('invalid args'));
      return;
    }

    resolve(!args[0]);
  });
};

/**
 * checks for equality of 2 arguments
 * @param  {anything} e1  The first element to check against the other
 * @param  {anything} e2  The second element to check against the other.
 * @return {Boolean} e1 === e2. Note that they should be of the same type or possible
 *                   to compare.
 * @version 1.0
 */
function eq(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    resolve(args[0] === args[1]);
  });
};

/**
 * checks for greater than between 2 arguments
 * @param  {anything} e1  The first element to check against the other
 * @param  {anything} e2  The second element to check against the other.
 * @return {Boolean} e1 > e2. Note that they should be of the same type or possible
 *                   to compare.
 * @version 1.0
 */
function gt(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    resolve(args[0] > args[1]);
  });
};

/**
 * checks for less than between 2 arguments
 * @param  {anything} e1  The first element to check against the other
 * @param  {anything} e2  The second element to check against the other.
 * @return {Boolean} e1 < e2. Note that they should be of the same type or possible
 *                   to compare.
 * @version 1.0
 */
function lt(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    resolve(args[0] < args[1]);
  });
};

/**
 * check for text matching using normal regular expressions
 * @param  {String} text  The text we want to check against the regular expressions.
 *                        This can be the url for example.
 * @param  {list} regexes The list of strings (regexes) we will use to check the
 *                        text.
 * @return {Boolean} true if any of the regexes matches the text, false otherwise
 * @version 1.0
 */
function match(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
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

/**
 * @deprecated This method is kind of buggy and should not be used.
 * check for url matching using normal regular expressions
 * @param  {list} regexes The list of strings (regexes) we will use to check the
 *                        text.
 * @return {Boolean} true if any of the regexes matches the text, false otherwise
 * @version 1.0
 */
function match_url(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
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

/**
 * @deprecated maybe?
 * Returns the property of an element, not sure when this is used tho.
 * @param  {Object} obj   The object from where we want to extract the value.
 * @param  {String|Element} key the key on the object to access it
 * @return {Object}      return whatever obj[key] is.
 * @version 1.0
 */
function prop(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
    }

    var obj = args[0];
    var key = args[1];

    resolve(args[0][key]);
  });
};

/**
 * @deprecated maybe?
 * Returns a list of extracted values from a list of objects.
 * @param  {list} objList the object list from where we will extract the values elements.
 * @param  {String} key they key name to be extracted from the objects
 * @return {list}   list of elements extracted from the object list.
 * @version 1.0
 */
function prop_array(args) {
  return new Promise((resolve, reject) => {
    if(args.length < 2) {
      reject(new Error('invalid args'));
      return;
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

/**
 * return the current timestamo
 * @return {Number} current time (Date.now())
 * @version 1.0
 */
function timestamp(args) {
  return new Promise((resolve, reject) => {
    resolve(Date.now());
  });
};

/**
 * returns the current hour of the current time
 * @return {Number} current hour
 * @version 1.0
 */
function day_hour(args) {
  return new Promise((resolve, reject) => {
    resolve(new Date().getHours());
  });
};

/**
 * return the current week day
 * @return {number} returns the current week day number
 * @version 1.0
 */
function week_day(args) {
  return new Promise((resolve, reject) => {
    resolve(new Date().getDay() + 1);
  });
};

/**
 * @deprecated maybe?
 * returns the current month of the year
 * @return {Number} returns the current month?
 * @version 1.0
 */
function month_day(args) {
  return new Promise((resolve, reject) => {
    resolve(new Date().getDate());
  });
};


ops['$if_pref'] = if_pref;
ops['$log'] = log
ops['$and'] = and;
ops['$or'] = or;
ops['$not'] = not;
ops['$eq'] = eq;
ops['$gt'] = gt;
ops['$lt'] = lt;
ops['$match'] = match;
ops['$match_url'] = match_url;
ops['$prop'] = prop;
ops['$prop_array'] = prop_array;
ops['$timestamp'] = timestamp;
ops['$day_hour'] = day_hour;
ops['$week_day'] = week_day;
ops['$month_day'] = month_day;


export default ops;
