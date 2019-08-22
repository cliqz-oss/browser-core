/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../core/config';
import logger from './logger';
import ResourceLoader from '../core/resource-loader';
import pacemaker from '../core/services/pacemaker';

// Default polling interval for patterns from the backend
const DEFAULT_UPDATE_INTERVAL_IN_MS = 60 * 60 * 1000; // 1 hour

// Faster retry interval if the initial fetching of the
// resources failed because the network was down.
// If that network call fails again, give up and keep
// waiting for the longer default interval.
const RETRY_INTERVAL_IN_MS = 60 * 1000; // 1 min

// If the internet connection is slow, loading the patterns
// for the first time will block the start of the Human Web module.
//
// If this timeout is exceeded, stop waiting and continue
// even if Human Web is not fully initialized yet.
// The ongoing requests will not be aborted, so human web will
// eventually be fully initialized.
//
const DEFAULT_INIT_TIMEOUT_IN_MS = 3 * 1000;

/**
 * Loads contact extraction patterns from the Cliqz backend.
 * For instance, these pattern define rules to recognize
 * queries from search engine result pages.
 * To keep in sync with the backend, the client will regularly
 * poll for changes.
 *
 * If the initial loading of the pattern fails because the network
 * is not available, human web will start in a well-defined state
 * but some functionality will be disabled until the patterns could
 * be successfully fetched from the server.
 *
 * Well-defined state means that no patterns will be active.
 * In other words, there should be no errors, but at the same
 * time no content will be collected. Once the patterns are
 * loaded, full functionality of human web will be restored.
 */
export default class ContentExtractionPatternsLoader {
  /**
   * @param onUpdateCallback: (patternsConfig, mode)
   *
   * where mode = 'strict' or 'normal'
   */
  constructor(onUpdateCallback) {
    this.updatePatternsDefaultIntervalInMs = DEFAULT_UPDATE_INTERVAL_IN_MS;
    this.updatePatternsRetryIntervalInMs = RETRY_INTERVAL_IN_MS;
    this.initTimeoutInMs = DEFAULT_INIT_TIMEOUT_IN_MS;

    this.config = {
      normal: {
        name: 'patterns',
        chromeURL: `${config.baseURL}human-web/patterns.json`,
        remoteURL: config.settings.ENDPOINT_PATTERNSURL,
      },
      strict: {
        name: 'patterns-anon',
        chromeURL: `${config.baseURL}human-web/anonpatterns.json`,
        remoteURL: config.settings.ENDPOINT_ANONPATTERNSURL,
      },
    };

    this.onUpdateCallback = onUpdateCallback;
    this.resourceLoaders = {};
    this._activeTimers = new Set();
  }

  isLoaded() {
    return Object.keys(this.resourceLoaders).length > 0;
  }

  init() {
    if (this.isLoaded()) {
      return Promise.resolve();
    }

    const promises = Object.keys(this.config).map((ruleset) => {
      const cfg = this.config[ruleset];
      const resourceLoader = new ResourceLoader(['human-web', cfg.name], {
        chromeURL: cfg.chromeURL,
        remoteURL: cfg.remoteURL,
        cron: this.updatePatternsDefaultIntervalInMs,
        remoteOnly: true,
      });
      this.resourceLoaders[ruleset] = resourceLoader;

      resourceLoader.onUpdate((patternsConfig) => {
        logger.debug(`Updating "${ruleset}" content extraction patterns`);
        this.onUpdateCallback(patternsConfig, ruleset);
      });

      const loading = resourceLoader.load()
        .then((patternsConfig) => {
          this.onUpdateCallback(patternsConfig, ruleset);
        }).catch((e) => {
          logger.error(`Failed to initialize "${ruleset}" content extraction patterns: ${e}`);

          // make one retry attempt, in case that the network was only unavailable for a short time
          const timer = pacemaker.setTimeout(() => {
            logger.debug(`Retry to update "${ruleset}" content extraction patterns`);
            resourceLoader.updateFromRemote({ force: true }).catch(() => {});
            this._activeTimers.delete(timer);
          }, this.updatePatternsRetryIntervalInMs);
          this._activeTimers.add(timer);
        });

      const timeout = new Promise((resolve, reject) => {
        pacemaker.setTimeout(reject, this.initTimeoutInMs);
      });

      return Promise.race([loading, timeout]).catch(() => {
        logger.log(`WARNING: Timeout of ${this.initTimeoutInMs} ms exceeded `
                   + `while initializing the "${ruleset}" content extraction patterns`);
      });
    });

    return Promise.all(promises);
  }

  unload() {
    Object.keys(this.resourceLoaders).forEach(x => this.resourceLoaders[x].stop());
    this.resourceLoaders = {};

    // cancel all retry attempts
    this._activeTimers.forEach((x) => { pacemaker.clearTimeout(x); });
    this._activeTimers = new Set();

    return Promise.resolve();
  }
}
