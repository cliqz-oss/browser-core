import background from '../core/base/background';

import WebRequest, { VALID_RESPONSE_PROPERTIES } from '../core/webrequest';
import Pipeline from './pipeline';
import RequestContextStep from './steps/request-context';


function sanitizeResponse(response) {
  // add all properties in the VALID_RESPONSE_PROPERTIES set to the response
  return VALID_RESPONSE_PROPERTIES.reduce((result, prop) => {
    if (response[prop]) {
      return Object.assign(result, { [prop]: response[prop] });
    }
    return result;
  }, {});
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


export default background({
  enabled() { return true; },

  init() {
    this.requestContext = new RequestContextStep();
    const requestContextStep = [
      (...args) => this.requestContext.execute(...args),
      'determineContext'
    ];

    this.pipelines = {
      open: new Pipeline('webRequestPipeline.Open', [requestContextStep]),
      response: new Pipeline('webRequestPipeline.Response', [requestContextStep]),
      modify: new Pipeline('webRequestPipeline.Modify', [requestContextStep]),
    };

    this.onBeforeRequestListener = this.onBeforeRequest.bind(this);
    this.onBeforeSendHeadersListener = this.onBeforeSendHeaders.bind(this);
    this.onHeadersReceivedListener = this.onHeadersReceived.bind(this);

    WebRequest.onBeforeRequest.addListener(
      this.onBeforeRequestListener,
      { urls: ['*://*/*'] },
      ['blocking'],
    );
    WebRequest.onBeforeSendHeaders.addListener(
      this.onBeforeSendHeadersListener,
      { urls: ['*://*/*'] },
      ['blocking', 'requestHeaders']
    );
    WebRequest.onHeadersReceived.addListener(
      this.onHeadersReceivedListener,
      { urls: ['*://*/*'] },
      ['responseHeaders']
    );
  },

  onBeforeRequest(requestDetails) {
    const response = createResponse();
    this.pipelines.open.execute(requestDetails, response);
    return sanitizeResponse(response);
  },

  onBeforeSendHeaders(requestDetails) {
    const response = createResponse();
    this.pipelines.modify.execute(requestDetails, response);
    return sanitizeResponse(response);
  },

  onHeadersReceived(requestDetails) {
    const response = createResponse();
    this.pipelines.response.execute(requestDetails, response);
    return sanitizeResponse(response);
  },

  unload() {
    WebRequest.onBeforeRequest.removeListener(this.onBeforeRequestListener);
    WebRequest.onBeforeSendHeaders.removeListener(this.onBeforeSendHeadersListener);
    WebRequest.onHeadersReceived.removeListener(this.onHeadersReceivedListener);

    this.pipelines = {};
    this.requestContext.unload();
  },

  events: {
  },

  actions: {
    addPipelineStep(stage, opts) {
      if (this.pipelines[stage]) {
        this.pipelines[stage].addPipelineStep(opts);
      }
    },
    removePipelineStep(stage, name) {
      if (this.pipelines[stage]) {
        this.pipelines[stage].removePipelineStep(name);
      }
    },
  },
});
