import config from '../core/config';
import md5 from '../core/helpers/md5';

export default class TriggerMachine {
  constructor(eventLoop) {
    this.eventLoop = eventLoop;
    // we will use this to keep track which trigger is being evaluated and which not
    this.triggerEvalMap = {};

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
    if (this.isTriggerBeingEvaluated(self.rootTrigger)) {
      // everything is fine, we are executing it already
      return Promise.resolve(true);
    }
    return self.run(self.rootTrigger, context);
  }

  isTriggerBeingEvaluated(trigger) {
    if (!trigger || !trigger.trigger_id) {
      return false;
    }
    return this.triggerEvalMap[trigger.trigger_id];
  }

  run(trigger, context) {
    if (!trigger || !trigger.trigger_id) {
      // nothing to do
      return Promise.reject(new Error('invalid trigger format'));
    }

    // check now if it is being evaluated or not
    if (this.isTriggerBeingEvaluated(trigger)) {
      return Promise.reject(new Error('trigger is being evaluated'));
    }

    // we mark is as being evaluated
    this.triggerEvalMap[trigger.trigger_id] = true;

    var self = this;
    // add the trigger as context element so we can later access it
    // context.curr_trigger = trigger;
    self.buildTriggerData(trigger);

    return new Promise((resolve, reject) => {
      return self.eventLoop.operationExecutor.execute(trigger.built_conds, context).then(result => {
        if(result && trigger.built_actions) {
          var actionsP = [];
          trigger.built_actions.forEach(action => {
            actionsP.push(self.eventLoop.operationExecutor.execute(action, context));
          });

          Promise.all(actionsP).then(values => {
            resolve();
          }).catch(err => {
            reject(err);
          });
        } else {
          resolve();
        }
      }).catch(err => {
        reject(err);
      });
    }).then((result) => {
      delete self.triggerEvalMap[trigger.trigger_id];
      return Promise.resolve(result);
    }).catch((err) => {
      delete self.triggerEvalMap[trigger.trigger_id];
      return Promise.reject(err);
    });
  }

  /**
   * this method will let us pre-build a trigger condition object once we fetch it
   * from the backend so we can process it faster later.
   * @param  {[type]} trigger [description]
   * @return {[type]}         [description]
   */
  buildTriggerData(trigger) {
    if (!trigger) {
      return;
    }
    // check if we have already the data built
    if (trigger.built_conds || trigger.built_actions) {
      return;
    }

    // we will create a hash for each of the conditions here so we can
    // store them if needed and we will add it in each of the operations
    // a new field
    const operationPrefixRegexp = this.eventLoop.operationExecutor.operationPrefixRegexp;
    const contextPrefixRegexp = this.eventLoop.operationExecutor.contextPrefixRegexp;

    function getHash(op) {
      if (!op) {
        return null;
      }
      return md5(JSON.stringify(op));
    }

    function parseOp(op) {
      if (!op || op.length === 0) {
        return null;
      }
      op = op.slice();
      const genHash = getHash(op);
      const name = op.shift();

      let args = [];
      if (op.length > 0) {
        args = op.shift();
      }

      let ttl = 0;
      if (op.length > 0) {
        ttl = op.shift();
      }

      // we now build the args
      var argsP = [];
      args.forEach((a) => {
        if(a.constructor === Array && a.length > 0 && operationPrefixRegexp.exec(a[0])) {
          argsP.push(parseOp(a));
        } else {
          argsP.push(a);
        }
      });

      return {
        op_name: name,
        args: argsP,
        ttl,
        hash_id: genHash
      };
    }

    trigger.built_conds = parseOp(trigger.condition);
    const builtActions = [];
    trigger.actions.forEach((action) =>{
      builtActions.push(parseOp(action));
    });
    trigger.built_actions = builtActions;

    delete trigger.condition;
    delete trigger.action;
  }

}
