/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Sanitizer from './sanitizer';
import UrlAnalyzer from './url-analyzer';
import MessageSender from './message-sender';
import DuplicateDetector from './duplicate-detector';
import SearchExtractor from './search-extractor';
import JobScheduler from './job-scheduler';
import PersistedHashes from '../hpn-lite/persisted-hashes';
import logger from './logger';

export default class HumanWebLite {
  constructor({ config, storage, hpn }) {
    // Defines whether Human Web is fully initialized and has permission
    // to collect data.
    this.isActive = false;

    this.sanitizer = new Sanitizer(config);
    this.urlAnalyzer = new UrlAnalyzer();
    this.persistedHashes = new PersistedHashes({
      storage,
      storageKey: 'deduplication_hashes',
    });
    this.duplicateDetector = new DuplicateDetector(this.persistedHashes);

    this.messageSender = new MessageSender(this.duplicateDetector, hpn);
    this.searchExtractor = new SearchExtractor({
      config,
      sanitizer: this.sanitizer,
      persistedHashes: this.persistedHashes,
    });
    this.jobScheduler = new JobScheduler(this.messageSender, this.searchExtractor);
  }

  async init() {
    // TODO: In a feature-complete implementation, you would need
    // to have a mechanism to keep the extraction patterns up-to-date.
    // As we have hard-coded patterns, there is nothing to do here.
    this.isActive = true;
  }

  unload() {
    this.isActive = false;
    this.duplicateDetector.unload();

    // Attempt to finish all pending changes, though it would not
    // be critical if we loose them. Important operations should
    // already trigger a write operation.
    this.persistedHashes.flush();
  }

  /**
   * Should be called when the user navigates to a new page.
   *
   * Calling this function alone should not have a noticable
   * performance impact (both in terms of CPU or network).
   *
   * @return true iff new jobs were registered
   */
  async analyzeUrl(url) {
    if (!this.isActive) {
      return false;
    }

    const { found, ...doublefetchJob } = this.urlAnalyzer.parseSearchLinks(url);
    if (!found) {
      return false;
    }

    logger.debug('Potential Human Web content found on URL:', url);
    await this.jobScheduler.registerJob(doublefetchJob);
    return true;
  }

  processPendingJobs() {
    return this.jobScheduler.processPendingJobs();
  }
}
