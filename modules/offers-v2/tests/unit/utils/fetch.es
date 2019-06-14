const fetchMock = require('fetch-mock');
const nodeFetch = require('node-fetch');

// fetch-mock documentation:
// http://www.wheresrhys.co.uk/fetch-mock/

const fetchFunc = fetchMock.sandbox();

//
// For 'fake://' urls, support mocking without registration
//
// - If the url doesn't contain query string, return the url
// - If the query string doesn't consist of parameter=value pairs,
//   return the query string
// - If there are pairs, return them as a js object. Known names are:
//   body, status, headers, redirectUrl, throws
// - Name `header.headerName` adds `headerName` to the `headers`
//
function onFakeFetch(url) {
  let idx = url.indexOf('?');
  if (idx < 0) {
    return { body: url };
  }
  const query = url.substring(idx + 1);
  idx = query.indexOf('=');
  if (idx < 0) {
    return query;
  }
  const resp = {};
  query.split('&').forEach((pair) => {
    const [k, v] = pair.split('=', 2);
    resp[k] = v;
    if (k === 'status') {
      resp[k] = Number(v);
    }
    if (k.startsWith('header.')) {
      const hname = k.substring(7);
      if (!resp.headers) {
        resp.headers = {};
      }
      resp.headers[hname] = v;
    }
  });
  return resp;
}

fetchFunc.mock('begin:fake://', onFakeFetch);

fetchFunc.mock('begin:https://offers-api.cliqz.com/api/v1/categories', {
  categories: [],
  revision: 123,
});
fetchFunc.mock('begin:https://offers-api.cliqz.com/api/v1/loadsubtriggers', []);
fetchFunc.mock('begin:https://cdn.cliqz.com/offers/display_rules/rules.json.gz', {});
fetchFunc.mock('begin:/offers-v2/rules.json.gz', {});
fetchFunc.mock('begin:https://cdn.cliqz.com/extension/offers/test/resources', {});

module.exports = {
  'platform/fetch': {
    fetch: fetchFunc,
    Headers: nodeFetch.Headers,
    Request: nodeFetch.Request,
  },
  'platform/gzip': { },
  'platform/xmlhttprequest': { },
};
