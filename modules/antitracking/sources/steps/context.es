import HttpRequestContext from '../webrequest-context';
import { parseURL, dURIC, getHeaderMD5, URLInfo } from '../url';


export function determineContext(state) {
  const requestContext = new HttpRequestContext(state);
  const url = requestContext.url;
  // stop if no valid url
  if (!url || url == '') return false;

  const urlParts = URLInfo.get(url);

  state.requestContext = requestContext;
  state.url = url;
  state.urlParts = urlParts;

  const sourceUrl = requestContext.getSourceURL();
  state.sourceUrl = sourceUrl;
  state.sourceUrlParts = URLInfo.get(sourceUrl);

  if (!state.sourceUrlParts || !state.urlParts) return false;

  return true;
}

const internalProtocols = new Set(['chrome', 'resource', 'moz-extension']);

export function skipInternalProtocols(state) {
  if (state.sourceUrlParts && internalProtocols.has(state.sourceUrlParts.protocol)) {
    return false;
  }
  if (state.urlParts && internalProtocols.has(state.urlParts.protocol)) {
    return false;
  }
  return true;
}

export function checkSameGeneralDomain(state) {
  return state.urlParts.generalDomain !== state.sourceUrlParts.generalDomain;
}
