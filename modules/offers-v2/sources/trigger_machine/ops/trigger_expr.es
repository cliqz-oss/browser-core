/* eslint no-param-reassign: ["error", { "props": false }] */

import Expression from '../expression';
import logger from '../../common/offers_v2_logger';

/**
 * will start checking for requests in a domain. This is will start the mechanisms
 * to catch all requests that are performed on that domain so we can check for
 * conversions and more
 * @param  {string} domain the domain we want to start watching
 * @version 1.0
 */
class WatchRequestsExpr extends Expression {
  constructor(data) {
    super(data);
    this.domain = null;
  }

  isBuilt() {
    return this.domain;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 1) {
      throw new Error('WatchRequestsExpr invalid args');
    }
    this.domain = this.data.raw_op.args[0];
  }

  destroy() {
    if (!this.domain) {
      return;
    }
    const cb = this.data.trigger_machine_executor.processWatchReqCallback;
    if (!this.data.event_handler.isHttpReqDomainSubscribed(cb, this.domain)) {
      return;
    }
    this.data.event_handler.unsubscribeHttpReq(cb, this.domain);
  }

  getExprValue(/* ctx */) {
    try {
      const cb = this.data.trigger_machine_executor.processWatchReqCallback;
      if (this.data.event_handler.isHttpReqDomainSubscribed(cb, this.domain)) {
        // finish here
        return Promise.resolve(true);
      }

      // we add it and set the CB info
      const cbArgs = {
        trigger_id: this.data.parent_trigger.trigger_id
      };
      this.data.event_handler.subscribeHttpReq(cb, this.domain, cbArgs);
    } catch (e) {
      logger.error('Something happened when trying to subscribe the watch request', e);
    }
    return Promise.resolve(true);
  }
}

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

  getExprValue(ctx) {
    return new Promise((resolve, reject) => {
      if (!ctx._currentTriggerLevel) {
        ctx._currentTriggerLevel = 0;
      }

      ctx._currentTriggerLevel += 1;
      if (ctx._currentTriggerLevel > 25) {
        reject(new Error('trigger depth > 25'));
        return;
      }

      let subtriggers = this.data.trigger_cache.getSubtriggers(this.parentTriggerId);
      if (!subtriggers || subtriggers.length === 0) {
        // load from server

        this.data.be_connector.sendApiRequest(
          'loadsubtriggers',
          { parent_id: this.parentTriggerId }).then((payload) => {
          subtriggers = payload;

          logger.info('ActivateSubtriggersExpr', `Loaded ${subtriggers.length} subtriggers`);
          if (logger.LOG_LEVEL === 'debug') {
            logger.logObject(subtriggers.map(trigger => trigger.trigger_id));
          }

          // first cache
          this.data.trigger_cache.setSubtriggers(this.parentTriggerId, subtriggers);

          const p = [];
          subtriggers.forEach((trigger) => {
            this.data.trigger_cache.addTrigger(trigger);
            p.push(this.data.trigger_machine.run(trigger, ctx));
          });

          Promise.all(p).then(() => {
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }).catch((err) => {
          reject(err);
        });
      } else {
        const p = [];

        subtriggers.forEach((trigger) => {
          p.push(this.data.trigger_machine.run(trigger, ctx));
        });
        Promise.all(p).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      }
    });
  }
}

const ops = {
  $watch_requests: WatchRequestsExpr,
  $activate_subtriggers: ActivateSubtriggersExpr
};

export default ops;
