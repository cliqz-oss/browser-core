import { getDetailsFromUrl, urlStripProtocol } from '../../core/url';

const clean = (result) => {
  const details = getDetailsFromUrl(result.url || '');
  const host = urlStripProtocol(details.host || '');
  let hostAndPort = host;

  if (details.port) {
    hostAndPort += `:${details.port}`;
  }

  return {
    url: result.url,
    href: result.url,
    friendlyUrl: result.friendlyUrl || details.friendly_url,
    title: result.title,
    description: result.description,
    // TODO: clean `extra`
    extra: result.extra,
    image: result.image,
    kind: result.kind || [],
    style: result.style,
    provider: result.provider,
    template: result.template,
    suggestion: result.suggestion,
    text: result.text,
    // TODO: use template for supplementary-search
    type: result.type,
    meta: {
      ...result.meta,
      isIncomplete: result._incomplete,
      triggerMethod: result.trigger_method,
      domain: details.domain,
      host,
      hostAndPort,
      port: details.port,
      url: urlStripProtocol(result.url || ''),
      score: result.score,
      subType: result.subType || {},
      latency: result.latency,
      backendCountry: result.backendCountry,
    }
  };
};

/*
 * Normalizes a result to facilitate processing. Most importantly, flattens
 * links. Opposite of `oeprators/reconstruct`.
 *
 * @param {Object} result - The result.
 */
// TODO: just collect all non 'deepResults' data keys instead of naming them explicitly
const normalize = ({
  data: { deepResults = [], extra = {}, kind, template, suggestion, friendlyUrl } = {},
  ...result,
}) => ({
  links: [
    {
      ...clean({ ...result, extra, kind, template, suggestion, friendlyUrl, meta: { level: 0, type: 'main' } }),
    },
    ...deepResults.map(({ links, type }) =>
      links
        .map(link => clean({ ...link, meta: { level: 1, type } }))
    ).reduce((a, b) => a.concat(b), [])
  ],
});

// TODO: store main link explicitly?
const getMainLink = ({ links }) => links
  .slice(0, 1)
  .find(({ meta: { type } }) => type === 'main');

const hasMainLink = ({ links }) => links
  .slice(0, 1)
  .some(({ meta: { type } }) => type === 'main');

export default normalize;
export { clean, getMainLink, hasMainLink };
