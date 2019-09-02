/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import DefaultMap from '../core/helpers/default-map';
import logger from './logger';
import random from '../core/crypto/random';
import pacemaker from '../core/services/pacemaker';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * By default, HPN should send messages that it receives from other modules
 * as soon as possible. Although for the client, sending a message has
 * some costs, it should not slow down the browser too much to justify
 * spreading out the computations. As an example, in "search via proxy",
 * it is expected that a burst of latency sensitive messages will be
 * generated, so HPN must be able to support that.
 *
 * If for clients, it does not matter, then what about the server? Here,
 * spreading out the messages can help in certain situations. As a rule of
 * thumb, a few individual clients sending a burst of messages is less of a
 * problem then having the whole population of users sending one message at
 * the exact same time.
 *
 * Example 1:
 * On extension startup, module A emits multiple messages. After that,
 * exactly every 2 hours after startup, another message will get send.
 *
 * Example 2:
 * At the start of each hour, module B emits multiple messages.
 *
 * For the server, example 1 is harmless, as users will not start their
 * browser all at once. Instead the traffic at is seen at the server
 * will look quite smooth.
 *
 * On the other hand, example 2 will result in spiky traffic, as the
 * users base will send at the same time (implicitely coordinated by
 * the clock time). Modules should avoid that if possible.
 *
 * In real world examples, spiky traffic can be more subtile. In addition,
 * smoothing out the traffic might not be straightforward and the effects
 * changes on the whole population of users can be hard to test locally.
 * As all changes have to be applied on the client side, it also means the
 * feedback cycles to find good heuristics are in the order of multiple weeks,
 * sometimes even months.
 *
 * On the server side, it is easier to understand the traffic patterns
 * and identify spikes. That means, if we would have a way to warn the
 * clients about known spikes, they could react and adjust their sending
 * behavior in that situations. As the recommendations come from the server,
 * it means the feedback cycle reduces from weeks/months to daily feedbacks,
 * as changes are no longer bound to client-side releases.
 *
 * For some types of messages, latency is crucial. An example are search
 * queries routed through HPN. These types of messages can be marked
 * as "nothrottle". They will never be delayed, even if a burst of messages
 * is being sent.
 */
export default class MessageThrottler {
  constructor() {
    this.totalPending = 0;
    this.laggingTotalPending = 0;
    this.pendingByAction = new DefaultMap(() => 0);
    this.laggingPendingByAction = new DefaultMap(() => 0);
    this.timers = new Map();

    // will be overwritten when we get updates from the server ("/config")
    this.initEmptyRuleSet();
  }

  initEmptyRuleSet() {
    const noTrafficHints = {};
    const emptySourceMap = {
      actions: {}
    };
    this.updateConfig(noTrafficHints, emptySourceMap);
  }

  async startRequest(msg, trustedClock) {
    const action = this.alias.get(msg.action) || msg.action;
    this.pendingByAction.update(action, x => x + 1);
    this.laggingPendingByAction.update(action, x => x + 1);
    this.totalPending += 1;
    this.laggingTotalPending += 1;

    const delay = this.computeRecommendedDelay(action, trustedClock);
    if (delay > 0) {
      const randomDelay = random() * delay;
      logger.log(`Too many messages (action=${msg.action}). `
        + 'According to the server, this could lead to traffic spikes on the backend. '
        + `To mitigate the situation, the server recommends to wait up to ${delay / 1000} seconds if possible. `
        + `Choosing a random delay of ${randomDelay / 1000} seconds...`);
      await this.delay(randomDelay);
      logger.log('Waking up from random delay. Ready to send message of type:', msg.action);
    }
  }

  endRequest(msg) {
    const action = this.alias.get(msg.action) || msg.action;
    this.pendingByAction.update(action, x => x - 1);
    this.totalPending -= 1;

    this.delay(10000).then(() => {
      this.laggingPendingByAction.update(action, x => x - 1);
      this.laggingTotalPending -= 1;
    });
  }

  /**
   * Try to update to the new traffic recommendation from the server.
   *
   * If there were any problems during the update (corrupted rules,
   * incompatible rules, etc), no changes will be made. Instead the
   * previous rule set will be active. Or, if all updates failed in
   * the past, the default (empty) rule set will be used.
   *
   * As all traffic rules are only recommendations from the server, individual
   * clients are free to ignore them. If non-backward compatible rules are
   * published, it should also be harmless, as long as the majority of the
   * clients understands the new recommendations.
   */
  updateConfig(trafficHints, sourceMap) {
    try {
      const {
        alias = {},
        normal = {},
        midnight = {},
        settings = {},
      } = trafficHints || {};

      const rules = {
        normal,
        midnight,
      };

      const _alias = new Map();
      for (const name of Object.keys(alias)) {
        alias[name].forEach(action => _alias.set(action, name));
      }

      const withDefault = (val, _default) => {
        if (val === undefined || val === null) {
          return _default;
        }
        if (!Number.isFinite(val)) {
          throw new Error('Expected number');
        }
        return val;
      };
      const _settings = {
        minUptimeForThrottle: withDefault(settings.minUptimeForThrottle, 20 * MINUTE),
        safeDelayAbsolute: withDefault(settings.safeDelayAbsolute, 30 * SECOND),
        safeDelayFraction: withDefault(settings.safeDelayFraction, 0.01),
      };

      if (_settings.minUptimeForThrottle < 0 || _settings.safeDelayAbsolute < 0
          || _settings.safeDelayFraction < 0) {
        throw new Error('Sanity check failed');
      }

      // Update traffic rules:
      this.rules = rules;
      this.sourceMap = sourceMap;
      this.alias = _alias;
      this.settings = _settings;
      logger.log('Successfully updated traffic hints:', rules);
    } catch (e) {
      logger.warn('Failed to update throttling config. Keep using the old recommendations.', e);
    }
  }

  /**
   * Interpret the traffic recommendation from the server, and compute a
   * maximum delay (in ms).
   */
  computeRecommendedDelay(actionGroup, trustedClock) {
    const sourceMapEntry = this.sourceMap.actions[actionGroup] || {};
    if (sourceMapEntry.nothrottle) {
      // actions where latency is important should never be throttled
      return 0;
    }

    // If the extension has not been running for long enough, we have to
    // assume that delaying messages is too risky. For example, if a user
    // prefers to regularly open and close the browser.
    //
    // Otherwise, if the extension has been running for a while, we can
    // assume that the user prefers to keep the browser open for a longer
    // time. In that case, we can take a controlled risk to delay the message.
    //
    // Notes:
    // * For users that open and close the browser frequently, the risk that
    //   their clients will send all traffic at the same time is mitigated,
    //   as the users will not open the browser all simultaneously. That is
    //   why ignoring them should be safe, as long as not all users fall
    //   into that category.
    // * Extension updates will also reset the timer. Given that, for normal
    //   users, updates are rare events, ignoring traffic recommendations
    //   after updates should be safe.
    const estimatedUptime = trustedClock.estimateHpnUptime() * MINUTE;
    if (estimatedUptime < this.settings.minUptimeForThrottle) {
      return 0;
    }

    // Find the best match of the server recommendations:
    // 1) Rules during notorious spike times will be preferred
    // 2) Rules for specific actions will be preferred over default rules
    const nearMidnight = trustedClock.midnightSpikeDanger();
    let rule;
    if (nearMidnight) {
      rule = rule || this.rules.midnight[actionGroup] || this.rules.midnight.default;
    }
    rule = rule || this.rules.normal[actionGroup];
    if (nearMidnight) {
      rule = rule || this.rules.midnight.default;
    }
    rule = rule || this.rules.normal.default;

    if (!rule) {
      // The server has no recommendations for us.
      // Keep sending messages as fast as possible.
      return 0;
    }

    const maxDelay = rule.maxDelay || 0;
    if (maxDelay <= 0) {
      // The server recommends to send immediately.
      return 0;
    }

    const minDelay = Math.min(rule.minDelay || 0, maxDelay);
    const recentMessages = this.laggingPendingByAction.get(actionGroup);
    if (minDelay === 0 && recentMessages <= 1 && !nearMidnight) {
      // No warning signs found.
      // As there is no mandatory delay, it should be safe to send immediately.
      return 0;
    }

    // By default, clients should prefer the minimum delays unless there
    // are situations with increased spike dangers (at midnight, or when
    // multiple messages of the same group have been recently sent).
    let minWeight = 1;
    let maxWeight = 0;
    if (recentMessages <= 1) {
      minWeight += 1;
    } else if (recentMessages > 2) {
      maxWeight += recentMessages;
    }
    if (nearMidnight) {
      maxWeight += 1;
    }
    const delay = (minWeight * minDelay + maxWeight * maxDelay) / (minWeight + maxWeight);

    // Waiting too long means that all timestamps in the messages will eventually
    // get outdated. To avoid messages being rejected, refuse waiting too long.
    const maxDelayBasedOnTimestamps = 10 * MINUTE;

    // When waiting too long while holding the message in memory, we
    // increase the risk of the browser being closed. If the extension
    // has been running for a while, we trust it a bit more.
    const maxDelayBasedOnUptime = this.settings.safeDelayAbsolute
      + estimatedUptime * this.settings.safeDelayFraction;

    const maxSafeDelay = Math.min(maxDelayBasedOnUptime, maxDelayBasedOnTimestamps);
    return Math.min(delay, maxSafeDelay);
  }

  async delay(timeInMs) {
    await new Promise((resolve) => {
      const timer = pacemaker.setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, timeInMs);
      this.timers.set(timer, resolve);
    });
  }

  cancelPendingTimers() {
    this.timers.forEach((wakeUp, timer) => {
      pacemaker.clearTimeout(timer);
      wakeUp();
    });
    this.timers.clear();
  }
}
