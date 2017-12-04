import { getRequest } from '../platform/human-web/doublefetch';
import { equals as urlEquals } from '../core/url';
import inject from '../core/kord/inject';
import logger from './logger';

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
 */
export default class DoublefetchHandler {

  constructor() {
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
      }
    };
  }

  /**
   * Starts the doublefetch for the given URL and returns
   * a promise which resolves to the content of the response,
   * or is rejected if the doublefetch is aborted.
   */
  anonymousHttpGet(url) {
    this._stats.callsToAnonymousHttpGet += 1;

    return this._pendingInit.catch(logger.error).then(() => {
      const requestStartedAt = new Date();
      this._purgeObsoleteRequests(requestStartedAt);

      if (this._state === State.DISABLED) {
        this._stats.rejected.doubleFetchDisabled += 1;
        return Promise.reject(`doublefetch disabled: skipping request to fetch ${url}`);
      }

      // bookkeeping: remember the request and clean it up in the end
      const entry = { ts: requestStartedAt, url, originalUrl: url };
      this._pendingRequests.push(entry);
      logger.debug('doublefetch: pending requests', this._pendingRequests.length);

      // start the anonymous GET request (stripping cookies, etc)
      this._stats.httpRequests.started += 1;
      const requestPromise = getRequest(url);
      entry.requestPromise = requestPromise;

      requestPromise.catch(logger.error).then(() => {
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

  _findPendingDoublefetchRequest(url) {
    const completeMatch = this._pendingRequests.filter(x => urlEquals(url, x.url));
    if (completeMatch.length > 0) {
      // should not be ambiguous, but when in doubt, let the oldest one win
      this._stats.matchDetails.perfectMatch += 1;
      return completeMatch[0];
    }

    // If there was no match, fallback to a version the where schema (http vs https) is ignored.
    // Requests like "http://goo.gl/..." may have been modified to "https://goo.gl/...".
    const normalizeSchema = x => x.replace(/^https:\/\//, 'http://');
    const ignoringSchema = this._pendingRequests.filter(x => urlEquals(normalizeSchema(url),
                                                                       normalizeSchema(x.url)));
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
    while (this._pendingRequests.length > 0 &&
           requestStartedAt - this._pendingRequests[0].ts > this.zombieRequestTimelimitMs) {
      logger.error(`doublefetch for url ${this._pendingRequests[0].url} was not cleaned up after ${this.zombieRequestTimelimitMs} ms.`);
      this._stats.errors.danglingEntryFound += 1;
      this._pendingRequests.shift();
    }
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
   *
   * TODO: Detection is currently based on the URL of the request.
   * Seems to work, but is there a more robust way to correlate pending requests?
   */
  _createOnHeadersReceivedHandler() {
    return {
      name: 'human-web.preventExpensiveDoublefetchRequests',
      spec: 'blocking',
      fn: (request, response) => {
        if (!(request.tabId && request.tabId === -1)) {
          // ignore requests to tabs
          return true;
        }

        const matchingPendingEvent = this._findPendingDoublefetchRequest(request.url);
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

  init() {
    this._pendingInit = this._pendingInit.catch(logger.error).then(() => {
      if (this._state === State.INITIALIZING) {
        throw new Error('Assertion failed: After all pending operation have finished, ' +
                        'we must never end up in the INITIALIZING state');
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
          .then(() => Promise.all(this._pendingRequests.map(x => x.requestPromise.catch(() => {}))))
          .then(() => this._unloadPipeline())
          .then(() => this._setState(State.DISABLED));
    this._pendingInit = pendingUnload.catch(logger.error);

    return pendingUnload;
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

    const handler = this._createOnHeadersReceivedHandler();
    return this._webRequestPipeline.isReady()
      .then(() => this._webRequestPipeline.action('addPipelineStep',
                                                  'onHeadersReceived',
                                                  handler))
      .then(() => { this._onHeadersReceivedHandler = handler; });
  }

  _unloadPipeline() {
    if (!this._onHeadersReceivedHandler) {
      return Promise.resolve();
    }

    return this._webRequestPipeline.action('removePipelineStep',
                                           'onHeadersReceived',
                                           this._onHeadersReceivedHandler.name)
      .catch(logger.error)
      .then(() => {
        this._onHeadersReceivedHandler = null;
      });
  }
}
