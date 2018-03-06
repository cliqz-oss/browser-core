import { getMainLink } from './normalize';
import { urlStripProtocol } from '../../core/url';


const isAutocompletable = (query, url) => {
  if (!query || !url) {
    return false;
  }

  const strippedUrl = urlStripProtocol(url);
  const strippedQuery = urlStripProtocol(query);

  // in case a typed query fully matches the url, we do not cosider it
  // an autocompletable, so instant result will be shown and if used will
  // not be counted as provided by Cliqz
  if (
    (url === query) ||
    (url === strippedQuery) ||
    (strippedUrl === query) ||
    (strippedUrl === strippedQuery)
  ) {
    return false;
  }

  // TODO: use meta.url?
  return (
    url.startsWith(query) ||
    url.startsWith(strippedQuery) ||
    strippedUrl.startsWith(query) ||
    strippedUrl.startsWith(strippedQuery)
  );
};

/*
 * Trims list of results by removing the instant results if the first result
 * thereafter is autocompletable.
 *
 * @param {Object[]} results - The list of results.
 */
const trim = (results) => {
  const [first, second, ...rest] = results;
  if (!first || getMainLink(first).provider !== 'instant') {
    return results;
  }

  // TODO: get query explictly, `text` might be outdated
  //       (i.e., if it was carried over from a previous query)
  const query = getMainLink(first).text;

  if (!second) {
    return results;
  }

  if (isAutocompletable(query, getMainLink(second).url)) {
    return [second, ...rest];
  }

  return results;
};

const PREVENT_AUTOCOMPLETE_KEYS = ['Backspace', 'Delete'];

export default (response) => {
  const shouldKeepInstantResult = PREVENT_AUTOCOMPLETE_KEYS.includes(response.keyCode);

  if (shouldKeepInstantResult) {
    return response;
  }

  return {
    ...response,
    results: trim(response.results),
  };
};
