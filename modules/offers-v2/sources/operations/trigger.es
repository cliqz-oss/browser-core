

var ops = {};
export default ops;

ops['$activate_subtriggers'] = function(args, eventLoop, context) {
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
