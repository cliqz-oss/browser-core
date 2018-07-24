import { getDuplicateLinks } from '../links/utils';

// list of results => (flat) list of links
export const flattenLinks = results => results
  .map(({ links }) => links)
  .reduce((a, b) => [].concat(a, b), []);

export const getDuplicateLinksByUrl = (target, reference) => new Map(
  getDuplicateLinks(
    flattenLinks(target),
    flattenLinks(reference)
  ).map(link => [link.meta.url, link])
);

export const getResultOrder = results => results.map(result => result.kind);

