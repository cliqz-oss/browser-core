import { getMainLink } from './normalize';

const TYPES = new Map([
  [1, 'only-answer'],
  [2, 'overview'],
  [3, 'supplementary'],
]);

const MAPPINGS = new Map([

  ['calculator', 1],
  ['currency', 1],
  ['weatherEZ', 1],
  ['flight', 1],

  ['entity-news-1', 2],
  ['news', 2],
  ['lotto', 2],
  ['movie', 2],
  ['soccer', 2],
  ['ligaEZ1Game', 2],
  ['ligaEZGroup', 2],
  ['ligaEZTable', 2],

  ['generic', 3],
  ['hq', 3],
  ['people', 3],
  ['recipeRD', 3],
]);

const getResultsByType = (results = [], type) => results
  .map(getMainLink)
  .filter(({ template }) => MAPPINGS.get(template) === type);


const shouldDecrease = counts => counts.overview.length >= 2 ||
      counts.supplementary.length >= 1;

const hasSupplementarySearch = results => results
  .map(getMainLink)
  .some(res => res.type === 'supplementary-search');

const decreaseKind = (kind = []) => kind.map((k) => {
  if (k.indexOf('X') !== 0) {
    return k;
  }
  return 'm';
});


const decrease = (results) => {
  const counts = {
    'only-answer': getResultsByType(results, 1),
    overview: getResultsByType(results, 2),
    supplementary: getResultsByType(results, 3)
  };

  if (!shouldDecrease(counts)) {
    return results;
  }

  const generalizeResult = (result, meta = {}) => {
    const mainLink = getMainLink(result);
    const generalizedResult = {
      ...result.links[0],
      kind: decreaseKind(mainLink.kind),
      ...meta,
    };
    delete generalizedResult.extra;
    return generalizedResult;
  };

  let overviewResultsCounter = 0;
  return results.map((result, index) => {
    const mainLink = getMainLink(result);

    if (TYPES.get(MAPPINGS.get(mainLink.template)) === 'overview') {
      overviewResultsCounter += 1;
      if (overviewResultsCounter >= 2) {
        return {
          ...result,
          links: [
            generalizeResult(result, {
              template: 'generic',
            }),
          ],
        };
      }
    }

    if (TYPES.get(MAPPINGS.get(mainLink.template)) === 'supplementary') {
      if (
        (hasSupplementarySearch(results) && index >= 2) ||
        (!hasSupplementarySearch(results) && index >= 1)
      ) {
        return {
          ...result,
          links: [
            generalizeResult(result),
          ],
        };
      }
    }
    return result;
  });
};

/*
 * Enforces SmartCliqz & rich data display rules. Operates on a flattened
 * response (i.e., merge providers beforehand).
 *
 * @param {Object} response - The response.
 */
export default ({ results, ...response }) => ({
  results: decrease(results),
  ...response,
});
/* eslint-enable */
