import { getDuplicateLinks } from '../links/utils';

// list of results => (flat) list of links
export const flattenLinks = results => results
  .map(({ links }) => links)
  .reduce((a, b) => [].concat(a, b), []);

export const getDuplicateLinksByUrl = (target, reference) => new Map(
  getDuplicateLinks(
    flattenLinks(target),
    flattenLinks(reference)
  ).filter(link => link.meta.url)
    .map(link => [link.meta.url, link])
);

// TODO: verify that first response always exist (check `merge-results`)
export const getResultOrder = ({ responses: [{ results = [] }] = [{}] } = {}) =>
  results.map(result => result.kind);
