import { equals } from '../../core/url';
import { hasMainLink } from './normalize';

const except = (target, reference) => {
  const urls = Array.concat([],
    ...reference.map(({ links }) => links.map(({ meta: { url } }) => url)));

  return target.map(({ links, ...result }) => ({
    ...result,
    links: links
      .filter(r => !urls.some(url => equals(url, r.meta.url)))
  }));
};

// TODO: for operators, export "at same level" (response vs. results vs. links)
/*
 * Removes duplicate URLs in a response that occur in another response. For
 * example, removes URLs from backend results that also occur in history.
 *
 * @param {Object} target - The response to remove URLs from.
 * @param {Object} reference - The reference response.
 */
export default ([target, reference]) => ({
  ...target,
  results: except(target.results, reference.results)
    .filter(hasMainLink),
});
