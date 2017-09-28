import { getMainLink } from './normalize';
import { utils } from '../../core/cliqz';

const TYPES = new Map([
  [1, 'only-answer'],
  [2, 'overview'],
  [3, 'supplementary'],
]);

const MAPPINGS = new Map([
  ['calculator', 1],
  ['currency', 1],
  ['weatherEZ', 1],

  ['entity-news-1', 2],
  ['lotto', 2],
  ['movie', 2],
  ['soccer', 2],

  ['generic', 3],
  ['hq', 3],
  ['people', 3],
  ['recipeRD', 3],
]);

const decrease = (results) => {
  const counts = Array.from(TYPES.entries())
    .map(([type, desc]) => ({
      desc,
      count: results
        .map(getMainLink)
        .filter(({ template }) => MAPPINGS.get(template) === type)
        .length,
    }));

  // TODO: enforce rich data rules
  utils.log('rich data counts', counts);

  return results;
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
