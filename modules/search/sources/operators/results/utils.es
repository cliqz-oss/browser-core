import { getDuplicateLinks } from '../links/utils';

// list of results => (flat) list of links
const flattenLinks = results => results
  .map(({ links }) => links)
  .reduce((a, b) => [].concat(a, b), []);

const getDuplicateLinksByUrl = (target, reference) => new Map(
  getDuplicateLinks(
    flattenLinks(target),
    flattenLinks(reference)
  ).map(link => [link.meta.url, link])
);

const getResultOrder = results => results.map(result => result.kind);

export { flattenLinks, getDuplicateLinksByUrl, getResultOrder };
