import background from '../core/base/background';
import UrlWhitelist from '../core/url-whitelist';

import WebRequest, { VALID_RESPONSE_PROPERTIES, EXTRA_INFO_SPEC } from '../core/webrequest';
import Pipeline from './pipeline';
import WebRequestContext from './webrequest-context';
import PageStore from './page-store';
import logger from './logger';


/**
 *
 */
function sanitizeResponse(response, event) {
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


function createResponse() {
  return {
    redirectTo(url) {
      this.redirectUrl = url;
    },
    block() {
      this.cancel = true;
    },
    modifyHeader(name, value) {
      if (!this.requestHeaders) {
        this.requestHeaders = [];
      }
      this.requestHeaders.push({ name, value });
    }
  };
}


function createWebRequestContext(details, pageStore) {
  const context = details;

  // Check if we have a URL
  if (!context.url || context.url === '') {
    logger.error('createWebRequestContext no url', details);
    return null;
  }

  // **Chromium addition**
  // In Chromium, we do not know if the tab is Private from the webrequest
  // object, so we need to get this information from `pageStore`.
  if (context.isPrivate === null || context.isPrivate === undefined) {
    const tabId = context.tabId;
    if (tabId !== -1 && pageStore.tabs[tabId]) {
      context.isPrivate = pageStore.tabs[tabId].isPrivate;
    }
  }

  // **Chromium addition**
  // We do not get the `sourceUrl` in Chrome, so we keep track of the mapping
  // tabId/sourceUrl in `pageStore`.
  try {
    if (!context.sourceUrl && chrome && chrome.tabs) {
      context.sourceUrl = pageStore.getSourceURL(context);
    }
  } catch (ex) {
    /* Not defined on firefox yet */
  }

  // **Chromium addition**
  // Tag redirects
  if (context.isRedirect === null || context.isRedirect === undefined) {
    context.isRedirect = pageStore.isRedirect(context);
  }

  // **Chromium addition**
  if (context.type === 'main_frame') {
    pageStore.onFullPage(context);
  }

  return new WebRequestContext(context);
}


export default background({
  initialized: false,

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
    const pipeline = new Pipeline(`webRequestPipeline.${event}`, []);

    // Register listener for this event
    const listener = (details) => {
      const response = createResponse();

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

      return sanitizeResponse(response, event);
    };

    this.pipelines.set(event, {
      pipeline,
      listener,
    });

    // Register the event listener as an attribute of background so that we
    // can call it: `webRequestPipeline.background.onBeforeRequest(details)`.
    this[event] = listener;

    WebRequest[event].addListener(
      listener,
      { urls: ['<all_urls>'] },
      extraInfoSpec,
    );

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
