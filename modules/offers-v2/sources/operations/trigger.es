

var ops = {};


/**
 * will start checking for requests in a domain. This is will start the mechanisms
 * to catch all requests that are performed on that domain so we can check for
 * conversions and more
 * @param  {string} domain the domain we want to start watching
 * @version 1.0
 */
function watch_requests(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(args.length < 1) {
      reject(new Error('invalid args'));
      return;
    }

    var domain = args[0];

    eventLoop.environment.watchDomain(domain);

    resolve(true);
  });
}


/**
 * this method will fetch from the BE the new subtriggers given the parent trigger ID
 * @param  {string} parentTriggerID  the id of the parent trigger that we want to
 *                                   to fetch the subtriggers for
 * @version 1.0
 */
function activate_subtriggers(args, eventLoop, context) {
  return new Promise((resolve, reject) => {
    if(!context._currentTriggerLevel) {
      context._currentTriggerLevel = 0;
    }

    if(context._currentTriggerLevel++ > 25) {
      reject(new Error('trigger depth > 25'));
      return;
    }

    if(args.length < 1) {
      reject(new Error('invalid args'));
      return;
    }

    var parentTriggerId = args[0];
    var subtriggers = eventLoop.triggerCache.getSubtriggers(parentTriggerId)
    if(!subtriggers || subtriggers.length === 0) {
      // load from server

      eventLoop.environment.sendApiRequest(
          'loadsubtriggers',
          {'parent_id': parentTriggerId}).then(payload => {
        subtriggers = payload;

        eventLoop.environment.info("TriggerOperations", "Loaded " + subtriggers.length + " subtriggers");

        var p = [];
        subtriggers.forEach(trigger => {
          eventLoop.triggerCache.addTrigger(trigger);
          p.push(eventLoop.triggerMachine.run(trigger, context));
        });
        eventLoop.triggerCache.setSubtriggers(parentTriggerId, subtriggers);

        Promise.all(p).then(values => {
          resolve();
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    }
    else {
      var p = [];

      subtriggers.forEach(trigger => {
        p.push(eventLoop.triggerMachine.run(trigger, context));
      });

      Promise.all(p).then(values => {
        resolve();
      }).catch(err => {
        reject(err);
      });
    }
  });
};


ops['$watch_requests'] = watch_requests;
ops['$activate_subtriggers'] = activate_subtriggers;

export default ops;
