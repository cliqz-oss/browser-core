/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';

/**
 * Idea: Give the platform more control over the time when jobs
 * should be executed (e.g., delay doublefetch until you are
 * connected to a local network) and retry strategies
 * (e.g., do not retry failing doublefetch requests, as they are
 * costly, but retry failed sent messages reqests, etc).
 *
 * In a real world implementation, using native mechanism would
 * be preferable to keeping everything in memory, for example:
 * - https://github.com/transistorsoft/react-native-background-fetch
 * - https://github.com/billmalarky/react-native-queue
 *
 * Note: For doublefetch, we have to be careful not to queue
 * a lot of requests and ending up to do a lot of requests at the same time.
 * After a certain amount of time, we could just drop older tasks to
 * prevent that.
 */
export default class JobScheduler {
  constructor(messageSender, searchExtractor) {
    this.messageSender = messageSender;
    this.searchExtractor = searchExtractor;

    this.jobs = [];
  }

  async registerJob(job) {
    this.jobs.push(job);
  }

  async processPendingJobs() {
    /* eslint-disable no-await-in-loop */
    while (this.jobs.length > 0) {
      await this.runJob(this.jobs.shift());
    }
    return {
      workLeft: false
    };
  }

  async runJob(job) {
    if (job.type === 'search-go') {
      const { messages } = await this.searchExtractor.runJob(job);
      logger.debug('searchExtractor found', messages.length, 'messages');
      messages.forEach((message) => {
        this.jobs.push({ type: 'send-message', message });
      });
      return;
    }

    if (job.type === 'send-message') {
      await this.messageSender.send(job.message);
      return;
    }

    throw new Error(`Unexpected type: ${job.type}`);
  }
}
