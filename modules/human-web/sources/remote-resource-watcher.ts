/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Storage from '../platform/resource-loader-storage';
import prefs from '../core/prefs';
import { fromUTF8 } from '../core/encoding';
import { inflate } from '../core/zlib';
import { isUint8ArrayEqual } from '../core/array-buffer-utils';
import pacemaker from '../core/services/pacemaker';
import logger from './logger';
import SignatureVerifier from './signature-verifier';
import RemoteResourceFetcher from './remote-resource-fetcher';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// We can use the knowledge that the values originated from the
// "fetchResource" function (it is either string or Uint8Array).
function isContentEqual(x: string|Uint8Array|null, y?: string|Uint8Array|null) {
  if (x === null || y === null) {
    return x === null && y === null;
  }
  if (typeof x === 'string') {
    return typeof y === 'string' && x === y;
  }
  if (x instanceof Uint8Array) {
    return (y instanceof Uint8Array) && isUint8ArrayEqual(x, y);
  }
  throw new Error('Internal assumption violated');
}

class CacheInfo {
  prefPath: string;
  maxAge: number;
  lastContent!: string|Uint8Array|null;
  lastUpdated!: number;

  constructor(
      {moduleName, id, type, maxAge}:
          {moduleName: string, id: string, type: string, maxAge: number}) {
    if (!maxAge || maxAge <= 0) {
      throw new Error(`maxAge=${maxAge} is invalid`);
    }
    if (!moduleName || !id || !type) {
      throw new Error('missing path information');
    }

    this.prefPath = `cacheInfo.${moduleName}.${id}.${type}`;
    this.maxAge = maxAge;
    this.flush();
  }

  loadLastUpdatedFromDisk() {
    const value = prefs.get(this.prefPath);
    if (value) {
      try {
        const lastUpdated = Number.parseInt(value);
        if (lastUpdated >= 0 && lastUpdated < Date.now()) {
          // Note: >= 0 is intended to rule out NaN, and comparing with
          // the current time should help to recover from edge cases
          // where the system was once incorrectly set to the future.
          //
          // In our case, it is always safe to start with an empty cache.
          this.lastUpdated = lastUpdated;
        }
      } catch (e) {
        logger.warn(`Failed to parse value: ${value} (path: ${this.prefPath})`);
      }
    }
  }

  syncLastUpdatedToDisk() {
    prefs.set(this.prefPath, String(this.lastUpdated));
  }

  isTooOld({ byMoreThan = 0 * SECOND } = {}) {
    return Date.now() >= this.lastUpdated + this.maxAge + byMoreThan;
  }

  updateAndCheckIfModified(content: Uint8Array | string) {
    const modified = !isContentEqual(this.lastContent, content);
    if (modified) {
      this.lastContent = content;
    }

    // always update the time, as we are interested in the last time
    // we fetched the resource, not the last time it was modified
    this.lastUpdated = Date.now();
    this.syncLastUpdatedToDisk();

    return modified;
  }

  update(content: string|Uint8Array, { updateTimestamp = true }) {
    this.lastContent = content;
    if (updateTimestamp) {
      this.lastUpdated = Date.now();
      this.syncLastUpdatedToDisk();
    }
  }

  flush() {
    this.lastContent = null;
    this.lastUpdated = 0;
  }
};

/**
 * Callback that will be executed when the observed resource
 * has changed.
 *
 * After an extension restart, the callback will also be fired
 * once, after the last persisted state of the resource has been
 * loaded from disk.
 */
export interface ResourceUpdatedCallback {
  (arg1: string | Uint8Array): void;
}

export class RemoteResourceWatcher {
  id: string;
  moduleName: string;
  resourceUrl: string;
  signatureUrl: string;

  onUpdate: ResourceUpdatedCallback;
  uncompressWith: string;

  initialized: boolean;
  initInProgress: Promise<void>|null;
  pendingUpdate: Promise<void>|null;

  storage: Storage;
  verifiedContent: string|Uint8Array|null;
  verifiedContentNeedsToBePersisted: boolean;

  resourceOutdated: boolean;
  signatureOutdated: boolean;
  contentFetcher: RemoteResourceFetcher;
  signatureFetcher: RemoteResourceFetcher;

  contentCache: CacheInfo;
  signatureCache: CacheInfo;

  verifier: SignatureVerifier;
  knownFailingSignature: string|null;

  defaultRefreshTimer: number|null;
  earlyRetryTimer: number|null;

  constructor(options_: {
    moduleName: string,
    resource: {url: string, id: string},
    signature: {url: string, verifier: SignatureVerifier },
    onUpdate: ResourceUpdatedCallback,
    caching?: {maxAge?: number},
    uncompressWith?: string,
  }) {
    const options = options_;
    options.caching = options.caching || {};

    const nonEmpty = (x: any) => {
      if (!x) {
        throw new Error();
      }
      return x;
    };

    this.id = nonEmpty(options.resource.id);
    this.moduleName = nonEmpty(options.moduleName);
    this.resourceUrl = nonEmpty(options.resource.url);

    this.signatureUrl = nonEmpty(options.signature.url);
    this.verifier = nonEmpty(options.signature.verifier);

    this.onUpdate = nonEmpty(options.onUpdate);
    this.uncompressWith = options.uncompressWith || 'none';

    const maxAge = options.caching.maxAge || 1 * HOUR;
    this.initialized = false;
    this.initInProgress = null;

    // persistence layer where the data is stored once it
    // passed the verification
    this.storage = new Storage(['cliqz', this.moduleName]);
    this.verifiedContent = null;
    this.verifiedContentNeedsToBePersisted = false;

    // to prevent simulataneous updates
    // (while an update is in progress, all new attempts will be skipped)
    this.pendingUpdate = null;

    // we only watch for changes to the resource, but once it changes
    // we have to fetch the new message signature as well.
    this.resourceOutdated = false;
    this.signatureOutdated = false;
    this.contentFetcher = new RemoteResourceFetcher({
      url: this.resourceUrl,
      binary: true,
    });
    this.signatureFetcher = new RemoteResourceFetcher({
      url: this.signatureUrl,
      binary: false,
    });

    // to avoid repeating the same check
    this.knownFailingSignature = null;

    const cacheOptions = {
      moduleName: this.moduleName,
      id: this.id,
      maxAge,
    };

    this.contentCache = new CacheInfo({ type: 'content', ...cacheOptions});
    this.signatureCache = new CacheInfo({ type: 'signature', ...cacheOptions});

    this.defaultRefreshTimer = null;
    this.earlyRetryTimer = null;
  }

  async init() {
    if (this.initialized || this.initInProgress) {
      return;
    }
    let initFinished: any;
    this.initInProgress = new Promise((resolve, _) => {
      initFinished = resolve;
    });

    try {
      if (this.pendingUpdate) {
        await this.pendingUpdate;
      }

      this.contentCache.loadLastUpdatedFromDisk();
      this.signatureCache.loadLastUpdatedFromDisk();

      try {
        this.verifiedContent = await this._loadFromDisk();
        if (this.verifiedContent) {
          this.contentCache.update(this.verifiedContent, { updateTimestamp: false });
          this._notifyObservers(this.verifiedContent);
        }
      } catch (e) {
        logger.warn('Failed to load resources from disk. Starting with empty state.', e);
      }

      pacemaker.clearTimeout(this.defaultRefreshTimer);
      pacemaker.clearTimeout(this.earlyRetryTimer);
      this.earlyRetryTimer = null;
      this.defaultRefreshTimer = pacemaker.everyFewMinutes(this._checkUpdates.bind(this));

      this.initialized = true;

      // Normally, we do not need to refresh resources during extension startup,
      // but for users that do not keep the browser open for long, waiting for
      // multiple minutes could delay the update process unnecessarly because each
      // browser restarts resets the count.
      if (this.contentCache.isTooOld({ byMoreThan: 24 * HOUR })) {
        logger.info('Resource is too old. Forcing immediate refresh for', this.resourceUrl);
        pacemaker.nextIdle(this.forceUpdate.bind(this));
      }
    } finally {
      initFinished();
      this.initInProgress = null;
    }
  }

  forceUpdate() {
    logger.info('Forced update for resource:', this.resourceUrl);
    this.contentFetcher.resetRateLimits();
    this.signatureFetcher.resetRateLimits();
    this.resourceOutdated = true;
    this.signatureOutdated = true;
    this.knownFailingSignature = null;
    return this._checkUpdates();
  }

  unload() {
    this.initialized = false;
    if (this.initInProgress) {
      // The initialization is not yet finished. In this rare scenario, race conditions
      // are almost unavoidable, but at least make an attempt to end in an consistent state.
      logger.warn('Race condition: cannot gracefully stop initialization');
      this.initInProgress.then(() => this.unload()).catch(e => logger.warn(e));
    }

    pacemaker.clearTimeout(this.defaultRefreshTimer);
    pacemaker.clearTimeout(this.earlyRetryTimer);
    this.defaultRefreshTimer = null;
    this.earlyRetryTimer = null;

    // null out fields that are potentially large
    this.verifiedContent = null;
    this.knownFailingSignature = null;
    this.contentCache.flush();
    this.signatureCache.flush();
  }

  async _checkUpdates() {
    pacemaker.clearTimeout(this.earlyRetryTimer);
    this.earlyRetryTimer = null;

    if (!this.initialized) {
      return;
    }

    if (this.pendingUpdate) {
      logger.debug('There is already one update in progress');
      await this.pendingUpdate;
      return;
    }

    let updateFinished: any;
    this.pendingUpdate = new Promise((resolve, _) => {
      updateFinished = resolve;
    });
    try {
      logger.debug('Checking for updates for', this.resourceUrl);
      this.resourceOutdated = this.resourceOutdated || this.contentCache.isTooOld();
      if (this.resourceOutdated && !this.contentFetcher.tooManyRequests()) {
        logger.info('Fetching new content from', this.resourceUrl);
        const content = await this.contentFetcher.fetch();
        const modified = this.contentCache.updateAndCheckIfModified(content);
        if (modified) {
          this.signatureOutdated = true;
          this.knownFailingSignature = null;
        }
        this.resourceOutdated = false;
      }

      if (this.signatureOutdated && !this.signatureFetcher.tooManyRequests()) {
        logger.info('Fetching new signature from', this.signatureUrl);
        const content = await this.signatureFetcher.fetch();
        const modified = this.signatureCache.updateAndCheckIfModified(content);

        // Content has changed, but we still got the same, old signature.
        // It is unlikely that it will pass the verification, but as it can
        // happen that we saw a new signature before the actual content,
        // we still can try to verify it.
        if (modified) {
          this.signatureOutdated = false;
        }

        const message = this.contentCache.lastContent as Uint8Array|null;
        const signature = this.signatureCache.lastContent as string|null;
        if (message && signature && signature !== this.knownFailingSignature) {
          const isValid = await this.verifier.checkSignature(message, signature);
          if (isValid) {
            logger.info('Good signature from', this.signatureUrl);
            this.knownFailingSignature = null;
            this.signatureOutdated = false;
            if (!isContentEqual(message, this.verifiedContent)) {
              this.verifiedContent = message;
              this.verifiedContentNeedsToBePersisted = true;

              this._notifyObservers(this.verifiedContent);
            } else {
              // Edge case: it should be difficult to reach this point
              // except in test setups. It is not in itself a harmful case,
              // but newer signatures should normally not match older content.
              logger.warn('Got new matching signature but the content did not change');
            }
          } else {
            if (modified) {
              logger.warn('Signature did not match for', this.resourceUrl, '. Will retry later...');
            } else {
              logger.info('Signature has not changed for', this.resourceUrl,
                'Most likely we got an outdated version from the cached. Will retry later...');
            }
            this.knownFailingSignature = signature;
          }
        }
      }

      if (this.verifiedContentNeedsToBePersisted) {
        try {
          await this._writeToDisk();
          this.verifiedContentNeedsToBePersisted = false;
        } catch (e) {
          logger.info('Failed to write verified resources to disk. Retrying later...', e);
        }
      }
    } catch (e) {
      logger.warn('Failed to update resource:', this.resourceUrl, e);
    } finally {
      // if we were not successful in getting all content, do not wait
      // for the next updated interval (from pacemaker), but retry earlier
      this._scheduleEarlyRetryIfNecessary();

      this.pendingUpdate = null;
      updateFinished();
    }
  }

  _scheduleEarlyRetryIfNecessary() {
    const retryRequests = this.resourceOutdated || this.signatureOutdated;
    if (retryRequests && !this.earlyRetryTimer && this.initialized) {
      let cooldown = null;
      if (this.resourceOutdated) {
        cooldown = this.contentFetcher.getCooldownDuration();
      }
      if (this.signatureOutdated) {
        cooldown = Math.max(cooldown || 0, this.signatureFetcher.getCooldownDuration());
      }

      if (cooldown && cooldown < 1 * HOUR) {
        cooldown = Math.max(cooldown, 10 * SECOND);
        logger.debug('Scheduling retry in', cooldown, 'ms');
        this.earlyRetryTimer = pacemaker.setTimeout(this._checkUpdates.bind(this), cooldown);
      }
    }
  }

  async _loadFromDisk() {
    try {
      return await this.storage.load();
    } catch (e) {
      // Could have other reason, but the most likely case is that the
      // key does not exist (e.g., in a fresh profile).
      // For now, just assume that this is the case, at the risk
      // of hiding real IO errors. (TODO: switch to a different
      // API that allows to detect whether a key exist or not?)
      logger.warn(`Could not load resource "${this.moduleName}:${this.id}" from disk. Assuming this is a fresh profile, otherwise, this should not happen.`);
      return null;
    }
  }

  async _writeToDisk() {
    // edge case: prevent races during shutdown where
    // verifiedContent has been already unloaded
    if (!this.initialized) {
      logger.info('Skip persisting during shutdown.');
      return;
    }
    if (this.verifiedContent === null || this.verifiedContent === undefined) {
      // Should not be reachable, as shutdown has been already handled.
      logger.warn('Refusing to zero out the persisted state.');
      return;
    }

    // requirements to the data store: it has to support string and Uint8Array
    return this.storage.save(this.verifiedContent);
  }

  _uncompressIfNeeded(data: string|Uint8Array) {
    if (this.uncompressWith === 'none') {
      return data;
    }
    if (this.uncompressWith === 'gzip') {
      return fromUTF8(inflate(data as Uint8Array));
    }
    throw new Error(`Unexpected compression: ${this.uncompressWith}`);
  }

  _notifyObservers(verifiedContent?: string|Uint8Array) {
    if (verifiedContent !== null && verifiedContent !== undefined) {
      try {
        this.onUpdate(this._uncompressIfNeeded(verifiedContent));
      } catch (e) {
        logger.warn(`onUpdate callback failed for resource ${this.resourceUrl}`, e);
      }
    }
  }
}
