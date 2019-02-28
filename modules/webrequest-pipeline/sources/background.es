import background from '../core/base/background';
import UrlWhitelist from '../core/url-whitelist';

import WebRequest, { VALID_RESPONSE_PROPERTIES, EXTRA_INFO_SPEC } from '../core/webrequest';
import Pipeline from './pipeline';
import { createWebRequestContext } from './webrequest-context';
import PageStore from './page-store';
import logger from './logger';
import { isWebExtension } from '../core/platform';


/**
 *
 */
function sanitizeResponse(response, event) {
  // make sure when response.cancel is true, no other properties are set
  if (response.cancel === true) {
    return { cancel: true };
  }

  const allowedProperties = VALID_RESPONSE_PROPERTIES[event];

  if (allowedProperties.length === 0) {
    return {};
  }

  const result = Object.create(null);

  for (let i = 0; i < allowedProperties.length; i += 1) {
    const prop = allowedProperties[i];
    if (response[prop] !== undefined) {
      result[prop] = response[prop];
    }
  }

  return result;
}

function createResponse(details) {
  return {
    redirectTo(url) {
      this.redirectUrl = url;
    },
    block() {
      this.cancel = true;
    },
    _modifyHeaderByType(key, name, value) {
      if (!this[key]) {
        this[key] = [...(details[key] || [])];
      }
      const name_ = name.toLowerCase();
      // remove all headers with this name
      this[key] = this[key].filter(h => h.name.toLowerCase() !== name_);
      if (!isWebExtension || value) {
        this[key].push({ name, value });
      }
    },
    modifyHeader(name, value) {
      this._modifyHeaderByType('requestHeaders', name, value);
    },
    modifyResponseHeader(name, value) {
      this._modifyHeaderByType('responseHeaders', name, value);
    },
  };
}


export default background({
  initialized: false,
  requiresServices: ['telemetry'],

  enabled() { return true; },

  init() {
    if (this.initialized) {
      return;
    }

    this.whitelist = new UrlWhitelist('webRequestPipeline-whitelist');
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
      const response = createResponse(details);

      const webRequestContext = createWebRequestContext(details, this.pageStore);

      // Request is not supported, so do not alter
      if (webRequestContext === null) {
        return {};
      }

      // TODO - handle domain whitelisting
      pipeline.execute(
        webRequestContext,
        response,
        !this.whitelist.isWhitelisted(webRequestContext.url),
      );
      if (isWebExtension) {
        return sanitizeResponse(response, event);
      }
      return response;
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
    isWhitelisted(url) {
      return this.whitelist.isWhitelisted(url);
    },

    changeWhitelistState(url, type, action) {
      return this.whitelist.changeState(url, type, action);
    },

    getWhitelistState(url) {
      return this.whitelist.getState(url);
    },

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
