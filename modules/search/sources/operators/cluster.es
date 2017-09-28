import { clean, getMainLink } from './normalize';

const group = (a, b) =>
  a.set(b.domain, [...(a.get(b.domain) || []), b]);

const makeHeader = (domain, template) => clean({
  title: domain,
  url: domain,
  template,
  meta: {
    level: 0,
    type: 'main',
  },
});

// TODO: cluster by subdomains (e.g., maps.google.com)
// TODO: set max. domain count for clustering
/*
 * Clusters (history) results by domain.
 *
 * @param {Object} response - The provider's response.
 */
const cluster = (({ results, ...response }) => {
  const clustered = Array
    .from(results
      .map(result => ({ ...result, domain: getMainLink(result).meta.domain }))
      .reduce(group, new Map())
      .entries()
    )
    .map(([domain, grouped]) => {
      if (grouped.length === 1) {
        return grouped[0];
      }

      const main = grouped
        .find(result => getMainLink(result).meta.url === domain);
      const header = (main && getMainLink(main)) || makeHeader(domain, null);
      const rest = grouped
        .filter(result => getMainLink(result).meta.url !== domain);

      return {
        links: [
          header,
          // additional links (buttons etc.) from main result
          // TODO: assumes first is 'main' link
          ...(main && main.links.slice(1)) || [],
          // only main link from other results
          ...rest
            .map(getMainLink)
            .map(link => ({
              ...link,
              meta: {
                level: 1,
                type: 'history',
              }
            })),
        ],
      };
    });

  return {
    ...response,
    results: clustered,
  };
});

export default cluster;
