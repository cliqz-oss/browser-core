import { getEmptyResponse } from '../responses';

const _hasNoResults = response =>
  response.state === 'done' && response.results.length === 0;

/*
 * Starts search using given provider if given base stream completed empty
 * (i.e., without results).
 *
 * @param {String} query - The query.
 * @param {Object} provider - The provider.
 * @param {Observable} base$ - The stream.
 * @return {Observable}
 */
const searchOnEmpty = (query, provider, base$, config, hasNoResults = _hasNoResults) =>
  base$
    // only start searching if we don't have results from base stream
    .filter(hasNoResults)
    .take(1)
    .flatMap(() =>
      provider
        .search(query, config)
    )
    .startWith(getEmptyResponse(provider.id, config));

export default searchOnEmpty;
