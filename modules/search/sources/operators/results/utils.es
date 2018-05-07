import { urlStripProtocol } from '../../../core/url';
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

export const isAutocompletable = (query, url) => {
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

export const addCompletion = (results, query) => results.map(r => ({
  ...r,
  links: r.links.map(l => ({
    ...l,
    meta: {
      ...l.meta,
      isAutocompletable: isAutocompletable(query, l.url),
    }
  })),
}));
