import { getMainLink } from './normalize';
import { urlStripProtocol } from '../../core/url';

const isAutocompletable = (query, url) => {
  if (!query || !url) {
    return false;
  }

  // TODO: use meta.url?
  return url.startsWith(query) ||
    urlStripProtocol(url).startsWith(query);
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

export default ({ results, ...response }) => ({
  results: trim(results),
  ...response,
});
