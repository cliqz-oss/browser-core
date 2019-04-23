/* eslint no-param-reassign: ["error", { "props": false }] */

import prefs from '../../../core/prefs';
import Expression from '../expression';
import logger from '../../common/offers_v2_logger';
import { timestampMS, shouldKeepResource } from '../../utils';


/**
 * this method will fetch from the BE the new subtriggers given the parent trigger ID
 * @param  {string} parentTriggerID  the id of the parent trigger that we want to
 *                                   to fetch the subtriggers for
 * @version 1.0
 */
class ActivateSubtriggersExpr extends Expression {
  constructor(data) {
    super(data);
    this.parentTriggerId = null;
  }

  isBuilt() {
    return this.parentTriggerId;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 1) {
      throw new Error('ActivateSubtriggersExpr invalid args');
    }
    this.parentTriggerId = this.data.raw_op.args[0];
  }

  destroy() {
  }

  async getExprValue(ctx) {
    if (!ctx._currentTriggerLevel) {
      ctx._currentTriggerLevel = 0;
    }

    ctx._currentTriggerLevel += 1;
    if (ctx._currentTriggerLevel > 25) {
      throw new Error('trigger depth > 25');
    }

    let subtriggers = this.data.trigger_cache.getSubtriggers(this.parentTriggerId);

    // load from server
    if (!subtriggers || subtriggers.length === 0) {
      const startLoadMs = timestampMS();
      const recordLoadMs = () => {
        const thisLoadMs = timestampMS() - startLoadMs;
        ctx['#httpLoadMs'] = (ctx['#httpLoadMs'] || 0) + thisLoadMs;
      };

      const country = prefs.get('config_location', '') || '';
      const downloadedSubtriggers = await this.data.be_connector.sendApiRequest(
        'loadsubtriggers',
        { parent_id: this.parentTriggerId, country },
        'GET'
      );
      recordLoadMs();

      // we filter here the triggers that are not associated to the user group
      // #EX-7061
      const keepTrigger = t =>
        t && ((t.user_group === undefined) || shouldKeepResource(t.user_group));

      subtriggers = downloadedSubtriggers.filter(keepTrigger);

      logger.info('ActivateSubtriggersExpr', `Loaded ${subtriggers.length} subtriggers`);

      // cache downloaded triggters
      this.data.trigger_cache.setSubtriggers(this.parentTriggerId, subtriggers);
      subtriggers.forEach(t => this.data.trigger_cache.addTrigger(t));
    }

    // execute subtriggers
    const p = Array.from(subtriggers, (trigger) => {
      const localCtx = { ...ctx, vars: {} };
      return this.data.trigger_machine.run(trigger, localCtx)
        .catch(e => logger.warn(`Error in subtrigger ${trigger.trigger_id}, skipping: ${e}`));
    });
    return Promise.all(p);
  }
}

const ops = {
  $activate_subtriggers: ActivateSubtriggersExpr
};

export default ops;
