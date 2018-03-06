import { clean, getMainLink } from './normalize';

const group = (a, b) =>
  a.set(b.domain, [...(a.get(b.domain) || []), b]);

const makeHeader = (domain, query, scheme = 'http', provider) => clean({
  title: domain,
  url: `${scheme}://${domain}`,
  text: query,
  provider,
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
      .map(result => ({ ...result, domain: getMainLink(result).meta.hostAndPort }))
      .reduce(group, new Map())
      .entries()
    )
    .map(([domain, grouped]) => {
      if (grouped.length === 1) {
        return grouped[0];
      }

      const main = grouped
        .find(result => getMainLink(result).meta.url === domain);
      const isHttps = grouped
        .every(result => getMainLink(result).url.startsWith('https'));
      // TODO: can we use HTTPs everywhere to determine if a domain supports https?
      const scheme = isHttps ? 'https' : 'http';
      // TODO: there is a chance that the domain on its own does not exist
      //       (in particular without 'www')
      const query = response.query;
      const header = (main && getMainLink(main)) ||
        makeHeader(domain, query, scheme, response.provider);
      header.kind = ['C', ...header.kind];
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
              kind: ['C', ...link.kind],
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
