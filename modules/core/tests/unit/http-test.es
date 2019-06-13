/* global describeModule */

// TODO

export default describeModule('core/http',
  function () {
    return {
      './console': {
        default: {}
      },
      './gzip': {
        default: {}
      },
      '../platform/xmlhttprequest': {
        default: {}
      },
      '../platform/chrome-url-handler': {
        default: {}
      },
      '../platform/fetch': {
        default: {}
      },
    };
  },
  function () {
    context('promiseHttpHandler', function () {
    });
  });
