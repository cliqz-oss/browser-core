import { XMLHttpRequest } from './xmlhttprequest';

try {
  Components.utils.importGlobalProperties(['fetch']);
  assert(fetch !== undefined);
} catch(e) {
  // polyfill fetch on FF < 39
  const fetchUrl = "chrome://cliqz/content/bower_components/whatwg-fetch/fetch.js";
  Services.scriptloader.loadSubScriptWithOptions(fetchUrl, {
    XMLHttpRequest,
  });
}

export default fetch;
export {
  fetch,
  Headers,
  Request,
  Response,
}
