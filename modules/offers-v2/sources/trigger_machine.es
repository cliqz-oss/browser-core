import config from '../core/config';

export default class TriggerMachine {
  constructor(eventLoop) {
    this.eventLoop = eventLoop;

    this.triggersRoot = config.settings['triggers-root'] || 'root';
    this.rootTrigger = {
      parent_trigger_ids: [],
      trigger_id: this.triggersRoot,
      ttl: 3600,
      condition: null,
      actions: [
        ["$activate_subtriggers", [this.triggersRoot]]
      ]
    };
  }


  runRoot(context) {
    var self = this;

    // if root trigger has expired, add it again.
    // This is needed to reload subtriggers
    if(!self.eventLoop.triggerCache.getTrigger(this.triggersRoot)) {
      self.eventLoop.triggerCache.addTrigger(self.rootTrigger);
    }

    return self.run(self.rootTrigger, context);
  }


  run(trigger, context) {
    var self = this;

    return new Promise((resolve, reject) => {
      self.eventLoop.operationExecutor.execute(trigger.condition, context).then(result => {
        if(result && trigger.actions) {
          var actionsP = [];
          trigger.actions.forEach(action => {
            actionsP.push(self.eventLoop.operationExecutor.execute(action, context));
          });

          Promise.all(actionsP).then(values => {
            resolve();
          }).catch(err => {
            reject(err);
          });
        }
        else {
          resolve();
        }
      }).catch(err => {
        reject(err);
      });
    });
  }

}
