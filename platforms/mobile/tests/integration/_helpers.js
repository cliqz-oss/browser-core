var expect = chai.expect;

function cliqzResponse(query, results) {
  return {
    q: query,
    results: results,
    schema_valid: true
  }
}


function $(selector) {
  return contentWindow.document.querySelectorAll(selector)
}

/**
 * @function mockHttp replace fetch with configured fetchMock
 * @param {object} window - test window
 * @param {RegExp} matcher - to match request
 * @param {object} response - mocked response
 * @param {object} options - configurations
 * fetchMock http://www.wheresrhys.co.uk/fetch-mock/api
 * is a library that stubs fetch to filter requests
 */
window.mockHttp = function () {
  var args = Array.prototype.slice.apply(arguments);
  var win = args.shift();
  window.fetchMock.mock.apply(fetchMock, args);
  win.fetch = window.fetch;
}