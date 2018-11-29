/* eslint no-param-reassign: ["error", { "props": false }] */

import prefs from '../../core/prefs';
import ExpressionBuilder from './exp_builder';
import logger from '../common/offers_v2_logger';
import ExpressionCache from './expression_cache';
import TriggerCache from './trigger_cache';

// /////////////////////////////////////////////////////////////////////////////
// consts

export default class TriggerMachine {
  constructor(globObjs) {
    this.globObjs = globObjs;
    this.globObjs.trigger_machine = this;
    this._onTriggerDestroy = this._onTriggerDestroy.bind(this);
    this.globObjs.trigger_cache = new TriggerCache(this._onTriggerDestroy);
    // the expression cache
    this.globObjs.expression_cache = new ExpressionCache();

    // the expressions builder
    this.expressionBuilder = new ExpressionBuilder(this.globObjs);

    // we hardcode the trigger root here
    this.triggersRoot = 'root';

    // override if exists this flag
    if (prefs.get('offersTriggerRootOverride')) {
      this.triggersRoot = prefs.get('offersTriggerRootOverride');
    }

    this.rootTrigger = {
      parent_trigger_ids: [],
      trigger_id: this.triggersRoot,
      ttl: 3600,
      condition: null,
      actions: [
        ['$activate_subtriggers', [this.triggersRoot]],
      ]
    };
  }

  /**
   * returns a trigger by ID if we have otherwise null is returned
   * @param  {[type]} triggerID [description]
   * @return {[type]}           [description]
   */
  getTriggerByID(triggerID) {
    return this.globObjs.trigger_cache.getTrigger(triggerID);
  }


  runRoot(context) {
    // if root trigger has expired, add it again.
    // This is needed to reload subtriggers
    if (!this.globObjs.trigger_cache.getTrigger(this.triggersRoot)) {
      this.globObjs.trigger_cache.addTrigger(this.rootTrigger);
    }

    return this.run(this.rootTrigger, context);
  }

  run(trigger, context) {
    if (!trigger || !context) {
      return Promise.reject(new Error('run: Invalid trigger or context'));
    }

    // check if the current pass already happened for the given trigger
    if (trigger.lastRunPass === undefined) {
      trigger.lastRunPass = -1;
    }
    const currentRunPass = context['#currentPass'];
    const shouldExecuteTrigger = trigger.lastRunPass !== currentRunPass;
    if (!shouldExecuteTrigger) {
      return Promise.resolve(true);
    }
    trigger.lastRunPass = currentRunPass;

    // we need to check if already build the conditions / actions of the trigger
    // if not we do it now
    if (!trigger.built_actions || !trigger.built_conds) {
      if (!this._buildTriggerData(trigger)) {
        return Promise.reject(new Error(`run: We couldnt build the trigger: ${JSON.stringify(trigger.trigger_id)}`));
      }
    }

    // we now evaluate the condition, and if it is true we evaluate each of the
    // other actions
    return this._executeExpression(trigger.built_conds, context).then((result) => {
      if (result && trigger.built_actions) {
        // we execute the actions
        const actionsP = [];
        trigger.built_actions.forEach((action) => {
          actionsP.push(this._executeExpression(action, context));
        });
        return Promise.all(actionsP)
          .then(() => Promise.resolve())
          .catch(err => Promise.reject(err));
      }
      return Promise.resolve();
    }).catch(err => Promise.reject(err));
  }

  /**
   * this method will let us pre-build a trigger condition object once we fetch it
   * from the backend so we can process it faster later.
   * @param  {[type]} trigger [description]
   * @return {[type]}         [description]
   */
  _buildTriggerData(trigger) {
    if (!trigger) {
      return false;
    }
    // check if we have already the data built
    if (trigger.built_conds || trigger.built_actions) {
      return true;
    }

    // we build the data now
    try {
      trigger.built_conds = this.expressionBuilder.createExp(trigger.condition, trigger);
      const builtActions = [];
      trigger.actions.forEach((action) => {
        builtActions.push(this.expressionBuilder.createExp(action, trigger));
      });
      trigger.built_actions = builtActions;
    } catch (err) {
      logger.error(`_buildTriggerData: something happened building the trigger: ${err}`);
      return false;
    }

    return true;
  }

  _executeExpression(expr, ctx) {
    // else we need to evaluate the expression and return
    return expr.evalExpr(ctx);
  }

  _onTriggerDestroy(t) {
    if (!t) {
      return;
    }
    if (t.built_conds) {
      t.built_conds.destroy();
      t.built_conds = null;
    }
    if (t.built_actions && t.built_actions.length > 0) {
      t.built_actions.forEach((action) => {
        if (action) {
          action.destroy();
        }
      });
      t.built_actions = null;
    }
  }
}
