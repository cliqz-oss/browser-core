import background from '../core/base/background';
import WebRequest, { VALID_RESPONSE_PROPERTIES, EXTRA_INFO_SPEC } from '../core/webrequest';
import { isWebExtension } from '../core/platform';

import Pipeline from './pipeline';
import WebRequestContext from './webrequest-context';
import PageStore from './page-store';
import logger from './logger';


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

  enabled() { return true; },

  init() {
    if (this.initialized) {
      return;
    }

    this.pipelines = new Map();
    this.pageStore = new PageStore();
    this.pageStore.init();

    this.initialized = true;
  },

  unload() {
    if (!this.initialized) {
      return;
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
        return {};
      }

      const response = new BlockingResponse(details);

      try {
        pipeline.execute(
          webRequestContext,
          response,
          true,
        );
      } catch (ex) {
        logger.error('While running pipeline', event, webRequestContext, ex);
      }

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
  },
});
