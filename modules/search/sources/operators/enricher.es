import { map, startWith, combineLatest } from 'rxjs/operators';

import logger from '../logger';
import { getMainLink } from './normalize';
import cluster from './cluster';

function containsRichInfo(result) {
  const mainLink = getMainLink(result);
  return result.links > 1
     || mainLink.type === 'rh'
    || (mainLink.extra && mainLink.extra.rich_data);
}

// TODO: should this be a RX subject? A pipeline step? Maybe a hot observable?
class Enricher {
  constructor() {
    this.cache = new Map();
  }

  // TODO: enrich before collecting (i.e., only for new results);
  //       note: history might come after backend
  connect(target, source) {
    // FIXME: this is never unsubscribed from!
    return target.pipe(
      map(cluster),
      combineLatest(source.pipe(startWith({ results: [] }))),
      map(this.enrich.bind(this))
    );
  }

  /*
   * Adds rich data from one to the other response. For example, enriches
   * history results with data from backend results.
   *
   * @param {Object} response - The response to enrich.
   * @param {Object} source - The response to take rich data from.
   */
  enrich([{ results, ...response }, source]) {
    const sources = new Map();
    source.results
      .map(result => [
        getMainLink(result),
        result,
      ])
      .forEach(([main, result]) => sources.set(main && main.meta.url, result));
    const enriched = {
      results: results.map((result) => {
        // TODO: assumes there is a 'main' link and that it's the first
        const main = getMainLink(result);
        const url = main.meta.url;

        const match = this.cache.get(url) || sources.get(url);
        if (!match || !containsRichInfo(match)) {
          return result;
        }
        logger.debug(`Enrich '${url}' (cached: ${this.cache.has(url)})`,
          result, match);

        const matchMainLink = getMainLink(match);
        const enrichedSublinks = this._enrichSublinks(result, match);

        const updated = {
          ...result,
          links: [
            {
              ...matchMainLink,
              style: [main.style, matchMainLink.style].filter(Boolean).join(' '),
              provider: main.provider,
              kind: main.kind,
              text: main.text,
              extra: {
                ...matchMainLink.extra,
                ...main.extra,
              },
              meta: {
                ...main.meta,
                originalUrl: main.url,
                isEnriched: true,
              },
            },
            ...enrichedSublinks,
          ]
        };
        this.cache.set(url, match);
        return updated;
      }),
      ...response,
    };
    return enriched;
  }

  // TODO: hook up to search session start or end
  clear() {
    this.cache.clear();
  }

  _enrichSublinks(target, source) {
    const sourceSublinks = source.links.slice(1);
    const targetSublinks = target.links.slice(1);
    const sourceLinksMap = new Map(
      sourceSublinks.map(link => [link.meta && link.meta.url, link])
    );

    const sublinks = targetSublinks.map((link) => {
      if (link.meta.url) {
        const richLink = sourceLinksMap.get(link.meta.url);
        if (richLink) {
          sourceLinksMap.delete(link.meta.url);
          return {
            ...richLink,
            style: [link.style, richLink.style].filter(Boolean).join(' '),
            provider: link.provider,
            kind: richLink.kind.concat(link.kind),
          };
        }
      }
      return link;
    });

    return sublinks.concat(Array.from(sourceLinksMap).map(([, link]) => link));
  }
}

export default Enricher;
