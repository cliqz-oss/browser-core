import { hasMainLink } from '../links/utils';

/**
  Removes links with duplicate URLs in a response.

  @param {Object} response The response to remove links from.
  @param {Map} duplicates The Map of duplicate URLs.
  @return {Object} The response without duplicate links.
*/
const deduplicate = ({ results, ...rest }, duplicates) => ({
  ...rest,
  results: results
    .map(({ links, ...result }) => ({
      ...result,
      links: links
        .filter(({ meta: { url } }) => !duplicates.has(url)),
    }))
    .filter(hasMainLink),
});

const annotate = ({ results, ...rest }, duplicates) => ({
  results: results.map(({ links }) => ({
    links: links.map(link => ({
      ...link,
      kind: link.kind.concat(duplicates.has(link.meta.url) ?
        duplicates.get(link.meta.url).kind : []),
    }))
  })),
  ...rest,
});

export { annotate, deduplicate };
