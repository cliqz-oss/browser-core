

export default class TriggerCache {
  constructor(eventLoop) {
    this.eventLoop = eventLoop;

    this.triggerIndex = {};

    this.lastExpireRun = 0;
  }


  // Add trigger to the cache.
  addTrigger(trigger) {
    var self = this;

    self.expireCache();

    // need adding time for expiration using ttl
    trigger._added_ts = self.timestamp();
    trigger._subtriggers = null;

    self.triggerIndex[trigger.trigger_id] = trigger;
  }


  getTrigger(triggerId) {
    var self = this;

    return self.triggerIndex[triggerId];
  }


  setSubtriggers(parentTriggerId, subtriggers) {
    var self = this;

    var trigger = self.triggerIndex[parentTriggerId];
    if(trigger) {
       trigger._subtriggers = subtriggers
    }
  }

  // Get dependent trigger from cache if any.
  getSubtriggers(triggerId) {
    var self = this;

    self.expireCache();

    var trigger = self.triggerIndex[triggerId];
    if(trigger && trigger._subtriggers) {
      var subtriggers = trigger._subtriggers.filter(function(subtrigger) {
        return self.triggerIndex[triggerId]
      });

      return subtriggers;
    }

    return [];
  }


  // Try to expire triggers. Run max once per minute.
  expireCache() {
    var self = this;

    var ts = self.timestamp();

    if(ts - this.lastExpireRun < 60000) {
      return;
    }

    for(var triggerId in self.triggerIndex) {
      if(trigger.ttl !== null && trigger._added_ts + trigger.ttl < ts) {
        delete self.triggerIndex[triggerId];
      }
    }

    self.lastExpireRun = ts;
  }


  timestamp() {
    return Math.round(Date.now() / 1000);
  }

}
