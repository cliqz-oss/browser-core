/* eslint-disable no-param-reassign */

import { timestamp } from '../utils';

export default class TriggerCache {
  constructor(triggerDestroyCb = null) {
    this.triggerIndex = {};
    this.lastExpireRun = 0;
    this.triggerDestroyCb = triggerDestroyCb;
  }

  // Add trigger to the cache.
  addTrigger(trigger) {
    this.expireCache();

    // need adding time for expiration using ttl
    trigger._added_ts = timestamp();
    trigger._subtriggers = null;

    this.triggerIndex[trigger.trigger_id] = trigger;
  }

  getTrigger(triggerId) {
    const self = this;

    return self.triggerIndex[triggerId];
  }

  setSubtriggers(parentTriggerId, subtriggers) {
    const self = this;

    const trigger = self.triggerIndex[parentTriggerId];
    if (trigger) {
      trigger._subtriggers = subtriggers;
    }
  }

  // Get dependent trigger from cache if any.
  getSubtriggers(triggerId) {
    const self = this;

    self.expireCache();

    const trigger = self.triggerIndex[triggerId];
    if (trigger && trigger._subtriggers) {
      const subtriggers = trigger._subtriggers.filter(() => self.triggerIndex[triggerId]);

      return subtriggers;
    }

    return [];
  }

  // Try to expire triggers. Run max once per minute.
  expireCache() {
    const ts = timestamp();

    if (ts - this.lastExpireRun < 60) {
      return;
    }

    Object.keys(this.triggerIndex).forEach((triggerId) => {
      const trigger = this.triggerIndex[triggerId];
      if (trigger.ttl !== null && trigger._added_ts + trigger.ttl < ts) {
        if (this.triggerDestroyCb) {
          this.triggerDestroyCb(this.triggerIndex[triggerId]);
        }
        delete this.triggerIndex[triggerId];
      }
    });

    this.lastExpireRun = ts;
  }
}
