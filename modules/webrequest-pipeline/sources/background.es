/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import WebRequest, { VALID_RESPONSE_PROPERTIES, EXTRA_INFO_SPEC } from '../core/webrequest';
import { isWebExtension } from '../core/platform';
import telemetry from '../core/services/telemetry';

import Pipeline from './pipeline';
import WebRequestContext from './webrequest-context';
import PageStore from './page-store';
import logger from './logger';
import CnameUncloaker, { isCnameUncloakSupported } from './cname-uncloak';

// Telemetry schemas
import performanceMetrics from './telemetry/metrics/performance';
import performanceAnalysis from './telemetry/analyses/performance';


function modifyHeaderByType(headers, name, value) {
  const lowerCaseName = name.toLowerCase();
  const filteredHeaders = headers.filter(h => h.name.toLowerCase() !== lowerCaseName);
  if (!isWebExtension || value) {
    filteredHeaders.push({ name, value });
  }
  return filteredHeaders;
}


/**
 * Small abstraction on top of blocking responses expected by WebRequest API. It
 * provides a few helpers to block, redirect or modify headers. It is also able
 * to create a valid blocking response taking into account platform-specific
 * allowed capabilities.
 */
class BlockingResponse {
  constructor(details) {
    this.details = details;

    // Blocking response
    this.redirectUrl = undefined;
    this.cancel = undefined;
    this.responseHeaders = undefined;
    this.requestHeaders = undefined;
    this.shouldIncrementCounter = undefined;
  }

  redirectTo(url) {
    this.redirectUrl = url;
  }

  block() {
    this.cancel = true;
  }

  modifyHeader(name, value) {
    this.requestHeaders = modifyHeaderByType(
      this.requestHeaders || this.details.requestHeaders || [],
      name,
      value,
    );
  }

  modifyResponseHeader(name, value) {
    this.responseHeaders = modifyHeaderByType(
      this.responseHeaders || this.details.responseHeaders || [],
      name,
      value,
    );
  }

  toWebRequestResponse(event) {
    const allowedProperties = VALID_RESPONSE_PROPERTIES[event];
    const response = {};

    for (let i = 0; i < allowedProperties.length; i += 1) {
      const prop = allowedProperties[i];
      const value = this[prop];
      if (value !== undefined) {
        response[prop] = value;
      }
    }

    return response;
  }
}


export default background({
  initialized: false,
  requiresServices: ['telemetry', 'pacemaker'],
  telemetrySchemas: [
    performanceMetrics,
    performanceAnalysis,
  ],

  enabled() { return true; },

  init(_settings, browser) {
    // Optionally enable CNAME-uncloaking.
    this.cnameUncloaker = (
      isCnameUncloakSupported(browser)
        ? new CnameUncloaker(browser.dns.resolve)
        : null
    );

    if (this.initialized) {
      return;
    }

    telemetry.register(this.telemetrySchemas);

    this.pipelines = new Map();
    this.pageStore = new PageStore();
    this.pageStore.init();

    this.initialized = true;
  },

  unload() {
    if (!this.initialized) {
      return;
    }

    telemetry.unregister(this.telemetrySchemas);

    if (this.cnameUncloaker !== null) {
      this.cnameUncloaker.unload();
      this.cnameUncloaker = null;
    }

    // Remove webrequest listeners
    this.pipelines.forEach((pipeline, event) => {
      this.unloadPipeline(event);
    });

    this.pageStore.unload();
    this.initialized = false;
  },

  unloadPipeline(event) {
    if (this.pipelines.has(event)) {
      const pipeline = this.pipelines.get(event);
      this[event] = undefined;
      WebRequest[event].removeListener(pipeline.listener);
      pipeline.pipeline.unload();
      this.pipelines.delete(event);
    }
  },

  getPipeline(event) {
    if (this.pipelines.has(event)) {
      return this.pipelines.get(event).pipeline;
    }

    // It might be that the platform does not support all listeners:
    if (WebRequest[event] === undefined) {
      return null;
    }

    // Get allowed options for this event (e.g.: 'blocking', 'requestHeaders',
    // etc.)
    const extraInfoSpec = EXTRA_INFO_SPEC[event];

    // Create pipeline step
    const pipeline = new Pipeline(`webRequestPipeline.${event}`, [], false);

    // Register listener for this event
    const listener = (details) => {
      const webRequestContext = WebRequestContext.fromDetails(details, this.pageStore, event);

      // Request is not supported, so do not alter
      if (webRequestContext === null) {
        logger.debug('Ignore unsupported request', details);
        return {};
      }

      const response = new BlockingResponse(details);

      // Optionally uncloack first-party CNAME to uncover 1st-party tracking.
      // This feature can only be enabled in the following cases:
      //
      // 1. `browser.dns` API is available (feature-detection)
      // 2. webRequest supports async response (Firefox)
      if (
        // Will be set if uncloaking is supported on this platform (check
        // background `init(...)` for more details).
        this.cnameUncloaker !== null

        // We ignore 'main_frame' to make sure we do not introduce any latency
        // on the main request (because of DNS resolve) and also because we do
        // not expect any privacy leak from this first request.
        && webRequestContext.type !== 'main_frame'

        // Check that request is 1st-party
        && webRequestContext.urlParts !== null
        && webRequestContext.tabUrlParts !== null
        && webRequestContext.tabUrlParts.generalDomain === webRequestContext.urlParts.generalDomain

        // Check that hostname is not the same as general domain (we need a subdomain)
        && webRequestContext.urlParts.hostname !== webRequestContext.urlParts.generalDomain
      ) {
        const cnameResult = this.cnameUncloaker.resolveCNAME(webRequestContext.urlParts.hostname);

        // Synchronous response means that the CNAME was cached.
        if (typeof cnameResult === 'string') {
          if (cnameResult !== '') {
            webRequestContext.setCNAME(cnameResult);
          }
          pipeline.safeExecute(webRequestContext, response, true);
          return response.toWebRequestResponse(event);
        }

        // Otherwise it's a promise and we wait for CNAME before processing.
        return cnameResult.then((cname) => {
          if (cnameResult !== '') {
            webRequestContext.setCNAME(cname);
          }
          pipeline.safeExecute(webRequestContext, response, true);
          return response.toWebRequestResponse(event);
        });
      }

      pipeline.safeExecute(webRequestContext, response, true);
      return response.toWebRequestResponse(event);
    };

    this.pipelines.set(event, {
      pipeline,
      listener,
    });

    // Register the event listener as an attribute of background so that we
    // can call it: `webRequestPipeline.background.onBeforeRequest(details)`.
    this[event] = listener;

    const urls = [
      'http://*/*',
      'https://*/*',
    ];

    if (extraInfoSpec === undefined) {
      WebRequest[event].addListener(
        listener,
        { urls },
      );
    } else {
      WebRequest[event].addListener(
        listener,
        { urls },
        extraInfoSpec,
      );
    }

    return pipeline;
  },

  events: {
  },

  actions: {
    addPipelineStep(stage, opts) {
      if (this.initialized) {
        const pipeline = this.getPipeline(stage);
        if (pipeline === null) {
          logger.error('WebRequest pipeline (add) does not have stage', stage);
        } else {
          pipeline.addPipelineStep(opts);
        }
      }
    },

    removePipelineStep(stage, name) {
      if (this.initialized) {
        const pipeline = this.getPipeline(stage);

        if (pipeline === null) {
          logger.error('WebRequest pipeline (remove) does not have stage', stage);
        } else {
          pipeline.removePipelineStep(name);
          if (pipeline.length === 0) {
            this.unloadPipeline(stage);
          }
        }
      }
    },

    getPageStore() {
      return this.pageStore;
    },

    getPageForTab(tabId) {
      return this.pageStore.tabs.get(tabId);
    },
  },
});
