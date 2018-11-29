import { isValidUrl, isSearchEngineResult } from '../../core/search-engines';

/*
 * Removes search engine results.
 *
 * @param {Object} result - The result.
 */
export default function clean({ links, ...result }) {
  return {
    ...result,
    links: links.filter(({ template, url }) => template === 'sessions'
      || (!isSearchEngineResult(url) && isValidUrl(url))),
  };
}
