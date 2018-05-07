import { hasResponded } from './responses/utils';

/*
 * Partially updates a list of responses to reduce flickering.
 */
export default function (results$, config) {
  // TODO: mark responses with state 'outdated' if they don't match the current query.
  return results$
    .scan((current, incoming) => {
      // TODO: this fails if a provider does not respond at all
      //       on empty query (will keep the old value)

      // this sorts providers according to config
      const providers = Object.keys(config.providers)
        .sort((a, b) => config.providers[a].order - config.providers[b].order);

      const anyResult = incoming.find(r => r.state === 'done');

      // We should not emit anything for empty query if we don't allow results
      // for empty query
      if (!anyResult.query && !anyResult.params.allowEmptyQuery) {
        return [
          anyResult,
        ];
      }

      return providers
        .map((provider) => {
          const cur = current.find(response => response.provider === provider);
          const next = incoming.find(response => response.provider === provider);
          if (hasResponded(next)) {
            return next;
          }
          return cur;
        })
        // remove undefined responses of providers that have not returned yet
        .filter(Boolean);
    });
}
