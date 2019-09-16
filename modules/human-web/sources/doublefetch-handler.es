/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getRequest } from '../platform/human-web/doublefetch';
import { equals as urlEquals } from '../core/url';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import logger from './logger';
import { parseURL } from './network';
import pacemaker from '../core/services/pacemaker';

const State = {
  DISABLED: 'DISABLED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY'
};

/**
 * Helper class to execute doublefetch requests:
 *
 * - Attempt an anonymous GET request against the URL
 *   (stripping login information, etc.)
 * - Requests that timeout or exceed a size limit
 *   ("maxDoubleFetchSize") are rejected.
 *
 * Scheduling of doublefetch requests is not handled, here.
 * Also processing the results of the requests (i.e., whether the
 * content of the page from anonymous GET is similar to the
 * content that the authenticated user got before).
 *
 * onHostnameResolved(hostname, ip):
 *   Hook that is triggered when a host name from doublefetch
 *   request was resolved. (Default: do nothing)
 */
export default class DoublefetchHandler {
  constructor({ onHostnameResolved = () => {} } = {}) {
    this._onHostnameResolved = onHostnameResolved;

    // requests exceeding this size in bytes will be cancelled
    this.maxDoubleFetchSize = 2097152; // default: 2MB

    // Conservative time limit that should never to exceeded,
    // but is intended for leak detection only.
    //
    // Should not be confused with a request timeout, as
    // it is only relevant for internal cleanup.
    this.zombieRequestTimelimitMs = 10 * 60 * 1000; // default: 10 minutes

    // Array of { ts: Date, url: String } sorted by timestamp (oldest comes first).
    this._pendingRequests = [];

    // init/unload lifecycle:
    //
    // Notes:
    // * _pendingInit is a promise that is only used for
    //   sequentializing and should always resolve successfully
    // * we start in DISABLED state, which means that all doublefetch
    //   requests will be rejected until "init" has been called.
    this._pendingInit = Promise.resolve();
    this._setState(State.DISABLED);

    this._webRequestPipeline = inject.module('webrequest-pipeline');

    // mostly for debugging purposes to get an idea what doublefetch does
    this._stats = {
      callsToAnonymousHttpGet: 0,
      httpRequests: {
        started: 0,
        finished: 0,
      },
      rejected: {
        doubleFetchDisabled: 0,
        exceededSizeLimit: 0,
      },
      allowDoublefetch: 0,
      redirectsFollowed: 0,
      errors: {
        inconsistentStateDetected: 0,
        danglingEntryFound: 0,
      },
      matchDetails: {
        noMatch: 0,
        perfectMatch: 0,
        relaxedMatch: 0,
      },
      strippedHeaders: 0,
      populatedDnsMappings: 0,
    };
  }

  /**
   * Starts the doublefetch for the given URL and returns
   * a promise which resolves to the content of the response,
   * or is rejected if the doublefetch is aborted.
   */
  anonymousHttpGet(url) {
    this._stats.callsToAnonymousHttpGet += 1;

    const logPreviusError = (e) => {
      logger.debug('Previous request failed (error: ', e || '<missing>',
        '). Ignore and continue...');
    };
    return this._pendingInit.catch(logPreviusError).then(() => {
      const requestStartedAt = new Date();
      this._purgeObsoleteRequests(requestStartedAt);

      if (this._state === State.DISABLED) {
        this._stats.rejected.doubleFetchDisabled += 1;
        return Promise.reject(new Error(`doublefetch disabled: skipping request to fetch ${url}`));
      }

      // bookkeeping: remember the request and clean it up in the end
      const entry = { ts: requestStartedAt, url, originalUrl: url };
      this._pendingRequests.push(entry);
      logger.debug('doublefetch: pending requests', this._pendingRequests.length);

      // start the anonymous GET request (stripping cookies, etc)
      this._stats.httpRequests.started += 1;
      const requestPromise = this._makeRequestAndWaitForHandlers(url, entry);
      entry.requestPromise = requestPromise;

      requestPromise.catch(logger.debug).then(() => {
        const elapsedMs = new Date() - requestStartedAt;
        logger.debug(`doublefetch for ${entry.url} completed after ${elapsedMs / 1000} seconds.`);
        this._stats.httpRequests.finished += 1;

        const index = this._pendingRequests.indexOf(entry);
        if (index !== -1) {
          this._pendingRequests.splice(index, 1);
        } else if (elapsedMs < this.zombieRequestTimelimitMs) {
          logger.error(`_pendingRequests is in an inconsistent state (url=${entry.url}).`);
          this._stats.errors.inconsistentStateDetected += 1;
        }
      });

      return requestPromise;
    });
  }

  _correlatePendingDoublefetchRequest(request) {
    const match = this._findPendingDoublefetchRequest(request);

    // Remember the requestId, so we can avoid all URL comparisons later.
    if (match && !match.requestId) {
      match.requestId = request.requestId;
    }

    return match;
  }

  _findPendingDoublefetchRequest(request) {
    // First, check for the requestId because it is the only information
    // that is 100% reliable. If we find a match, take it.
    // Otherwise, we need to fallback to heuristics.
    const pendingWithUnknownRequestId = [];
    for (const pending of this._pendingRequests) {
      if (!pending.requestId) {
        pendingWithUnknownRequestId.push(pending);
      } else if (pending.requestId === request.requestId) {
        return pending;
      }
    }

    if (!(request.tabId && request.tabId === -1)) {
      // ignore requests to tabs
      return null;
    }

    const completeMatch = pendingWithUnknownRequestId.filter(x => urlEquals(request.url, x.url));
    if (completeMatch.length > 0) {
      // should not be ambiguous, but when in doubt, let the oldest one win
      this._stats.matchDetails.perfectMatch += 1;
      return completeMatch[0];
    }

    // If there was no match, fallback to a version the where schema (http vs https) is ignored.
    // Requests like "http://goo.gl/..." may have been modified to "https://goo.gl/...".
    const normalizeSchema = x => x.replace(/^https:\/\//, 'http://');
    const ignoringSchema = pendingWithUnknownRequestId.filter(
      x => urlEquals(normalizeSchema(request.url), normalizeSchema(x.url))
    );
    if (ignoringSchema.length > 0) {
      // should not be ambiguous, but when in doubt, let the oldest one win
      this._stats.matchDetails.relaxedMatch += 1;
      return ignoringSchema[0];
    }

    this._stats.matchDetails.noMatch += 1;
    return null;
  }

  /**
   * In general, requests should be cleaned up automatically.
   * If that is not the case, it indicates that something went wrong.
   * To avoid leaking memory, clean up after a while when it is
   * obvious that the entry is no longer relevant.
   */
  _purgeObsoleteRequests(requestStartedAt) {
    while (this._pendingRequests.length > 0
           && requestStartedAt - this._pendingRequests[0].ts > this.zombieRequestTimelimitMs) {
      logger.error(`doublefetch for url ${this._pendingRequests[0].url} was not cleaned up after ${this.zombieRequestTimelimitMs} ms.`);
      this._stats.errors.danglingEntryFound += 1;
      this._pendingRequests.shift();
    }
  }

  _createOnBeforeSendHeadersHandler() {
    // List of headers that should be removed before sending out the request:
    // (Fetch requests in Firefox web-extension have a flaw. They attach
    //  origin: moz-extension//ID , which is specific to a user.*)
    const sensitiveHeaders = ['cookie', 'origin'];
    function isSensitiveHeader(header) {
      const name = header.name.toLowerCase();
      if (sensitiveHeaders.includes(name.toLowerCase())) {
        return true;
      }
      if (name.startsWith('x-')) {
        // Catches undesired headers added by the browser.
        //
        // Examples:
        // - "x-client-data: <id>"
        //   (added by Chrome when making request to Google domains,
        //    formerly 'X-Chrome-Variations')
        // - "x-devtools-emulate-network-conditions-client-id"
        //   (when dev-tools are open)
        //
        return true;
      }

      return false;
    }

    return {
      name: 'human-web.stripSensitiveHeadersInDoublefetch',
      spec: 'blocking',
      fn: (request, response) => {
        const matchingPendingEvent = this._correlatePendingDoublefetchRequest(request);
        if (matchingPendingEvent) {
          /* eslint-disable no-param-reassign */
          response.requestHeaders = request.requestHeaders.filter(
            header => !isSensitiveHeader(header)
          );
          if (response.requestHeaders.length !== request.requestHeaders.length) {
            this._stats.strippedHeaders += 1;
          }
        }
      }
    };
  }

  /**
   * This is the actual logic that we add to the WebRequest pipeline:
   *
   * Based on the "Content-Length" HTTP header, we abort all
   * requests that exceed our limit.
   *
   * To avoid cancelling non-doublefetch requests, skip
   * requests where the URL does not match any of the
   * double fetch requests.
   */
  _createOnHeadersReceivedHandler() {
    return {
      name: 'human-web.preventExpensiveDoublefetchRequests',
      spec: 'blocking',
      fn: (request, response) => {
        const matchingPendingEvent = this._correlatePendingDoublefetchRequest(request);
        if (!matchingPendingEvent) {
          // do not block request
          return true;
        }

        const contentLength = request.getResponseHeader('content-length');
        if (contentLength && contentLength > this.maxDoubleFetchSize) {
          this._stats.rejected.exceededSizeLimit += 1;
          logger.debug(`Response of ${request.url} exceeds limit of ${this.maxDoubleFetchSize} bytes. Aborting double fetch request.`);

          response.block();
          return false;
        }

        if (request.statusCode >= 300 && request.statusCode < 400) {
          const locationHeader = request.getResponseHeader('location');
          if (locationHeader) {
            this._stats.redirectsFollowed += 1;
            const redirectedTo = locationHeader;
            matchingPendingEvent.url = redirectedTo;
          }
        }

        // do not block request
        this._stats.allowDoublefetch += 1;
        return true;
      }
    };
  }

  _createOnCompletedHandler() {
    return {
      name: 'human-web.cacheDnsResolution',
      spec: 'blocking',
      fn: (request) => {
        if (!request.ip) {
          return;
        }

        const matchingPendingEvent = this._correlatePendingDoublefetchRequest(request);
        if (!matchingPendingEvent) {
          return;
        }

        const parsedURL = parseURL(request.url);
        if (!parsedURL) {
          logger.error('Failed to parse url:', request);
          return;
        }

        this._onHostnameResolved(parsedURL.hostname, request.ip);
        this._stats.populatedDnsMappings += 1;
        logger.debug(
          'Learned new DNS resolution from doublefetch:',
          parsedURL.hostname, ' -> ', request.ip
        );

        matchingPendingEvent.onCompletedHandlerFinished();
      }
    };
  }

  init() {
    this._pendingInit = this._pendingInit.catch(logger.debug).then(() => {
      if (this._state === State.INITIALIZING) {
        throw new Error('Assertion failed: After all pending operation have finished, '
                        + 'we must never end up in the INITIALIZING state');
      }

      if (this._state === State.READY) {
        return Promise.resolve();
      }

      this._setState(State.INITIALIZING);

      const pendingLoad = this._initPipeline().then(() => {
        this._setState(State.READY);
      }).catch((e) => {
        logger.error('Failed to initialize pipeline', e);
        this._setState(State.DISABLED);
      });
      this._pendingInit = pendingLoad;
      return pendingLoad;
    });
    return this._pendingInit;
  }

  unload() {
    if (this._state === State.INITIALIZING) {
      // Edge case: cannot abort the initialization.
      // So, wait for it and then immediately clean up.
      // (Calling "unload" multiple time is safe.)
      this._pendingInit = this._pendingInit
        .then(() => this.unload())
        .catch(logger.error);
    }

    // Has an immediate effect:
    // No new HTTP requests will be started. Instead all doublefetch
    // attempts will be rejected from now on until "init" is called.
    this._setState(State.DISABLED);

    // The rest is an async operation, but in case the extension is unloaded,
    // the WebRequestPipeline module will synchronously cleanup all listeners.
    //
    // But to avoid any races, delay the next initialization.
    // Also wait for all pending requests to end.
    const pendingUnload = this._pendingInit
      .then(() => Promise.all(this._pendingRequests
        .filter(x => x.requestPromise)
        .map(x => x.requestPromise.catch(() => {}))))
      .then(() => this._unloadPipeline())
      .then(() => this._setState(State.DISABLED));
    this._pendingInit = pendingUnload.catch(logger.error);

    return pendingUnload;
  }

  /**
   * Fetches the given URL and returns a promise that resolves
   * with the resulting body.
   *
   * In addition, it makes a best-effort attempt to wait for the completion
   * of the webrequestAPI handlers that are associated with the request.
   */
  _makeRequestAndWaitForHandlers(url, entry, onCompletedHandlerTimeoutInMs = 3000) {
    let handlerTimedOut;
    let timeoutTimer;
    let installTimeout = true;

    const waitForHandlersPromise = new Promise((resolve, reject) => {
      entry.onCompletedHandlerFinished = () => {
        installTimeout = false;

        pacemaker.clearTimeout(timeoutTimer);
        timeoutTimer = undefined;

        resolve();
      };
      handlerTimedOut = () => {
        const msg = `The request for url=${url} completed successfully, `
          + `but after waiting for ${onCompletedHandlerTimeoutInMs} ms, `
          + 'the "onCompleted" handler still did not trigger.';
        logger.warn(msg);
        reject(msg);
      };
    });

    return getRequest(url).then((body) => {
      // Normally, the onCompleted handler should trigger immediately
      // (either before or after the request is resolved).
      // To avoid that we hang forever if we fail to correlated requests,
      // install a timeout and give up eventually.
      if (installTimeout) {
        timeoutTimer = pacemaker.setTimeout(() => {
          logger.warn('Waiting for the "onCompleted" handler timed out for url', url);
          handlerTimedOut();
        }, onCompletedHandlerTimeoutInMs);
      }
      return waitForHandlersPromise.then(() => body);
    });
  }

  _setState(newState) {
    if (newState !== this._state) {
      logger.log(`changing state: ${this._state} => ${newState}`);
      this._state = newState;
    }
  }

  _initPipeline() {
    if (this._onHeadersReceivedHandler) {
      return Promise.resolve();
    }

    const beforeSendHeadersHandler = this._createOnBeforeSendHeadersHandler();
    const headersReceivedHandler = this._createOnHeadersReceivedHandler();
    const completedHandler = this._createOnCompletedHandler();
    return this._webRequestPipeline.isReady()
      .then(() => this._webRequestPipeline
        .action('addPipelineStep', 'onBeforeSendHeaders', beforeSendHeadersHandler))
      .then(() => { this._onBeforeSendHeadersHandler = beforeSendHeadersHandler; })
      .then(() => this._webRequestPipeline
        .action('addPipelineStep', 'onHeadersReceived', headersReceivedHandler))
      .then(() => { this._onHeadersReceivedHandler = headersReceivedHandler; })
      .then(() => this._webRequestPipeline
        .action('addPipelineStep', 'onCompleted', completedHandler))
      .then(() => { this._onCompletedHandler = completedHandler; });
  }

  _removePipelineStep(handler, stage) {
    if (!handler) {
      return Promise.resolve();
    }

    return ifModuleEnabled(
      this._webRequestPipeline.action('removePipelineStep', stage, handler.name)
    );
  }

  _unloadPipeline() {
    const remove = (handler, step) => {
      if (!this[handler]) {
        return Promise.resolve();
      }
      return this._removePipelineStep(this[handler], step);
    };

    return Promise.resolve()
      .then(() => remove('_onBeforeSendHeadersHandler', 'onBeforeSendHeaders'))
      .then(() => remove('_onHeadersReceivedHandler', 'onHeadersReceived'))
      .then(() => remove('_onCompletedHandler', 'onCompleted'))
      .then(() => {
        this._onBeforeSendHeadersHandler = null;
        this._onHeadersReceivedHandler = null;
        this._onCompletedHandler = null;
      });
  }
}
