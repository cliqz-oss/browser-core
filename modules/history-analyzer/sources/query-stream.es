import { URLInfo } from '../core/url-info';
import PatternMatching from '../platform/lib/adblocker';
import { isUrl } from '../core/url';

import IndexedStream from './indexed-stream';
import TIME_LIMIT_MS from './config';
import logger from './logger';
import tokenize from './utils';

const queryKeys = ['q', 'query', 'search_query', 'keywords', 'field-keywords', 'p'];
/**
 * Try to extract a query from an URL.
 */
export function extractQueryFromUrl(url) {
  const urlParts = URLInfo.get(url);
  if (urlParts !== null) {
    let query = null;
    for (const [key, value] of urlParts.searchParams.entries()) {
      if (queryKeys.indexOf(key) !== -1) {
        query = value;
        break;
      }
    }

    if (query !== null) {
      return {
        source: urlParts.generalDomain.split('.')[0],
        query: query.replace(/\+/g, ' ').toLowerCase(),
      };
    }
  }

  return null;
}


export default class QueryStream {
  constructor(historyProcessor, historyStream) {
    // Keep track of seen queries
    this.stream = new IndexedStream('query-stream');

    // Start listening to visited urls (live activity)
    historyStream.on('url', (visit) => {
      this.handleNewVisit(visit);
    });

    // Start listening to processed visits (history processing)
    historyProcessor.on('processedVisits', (visits) => {
      for (let i = 0; i < visits.length; i += 1) {
        this.handleNewVisit(visits[i]);
      }
    });

    this.query = this.stream.query.bind(this.stream);
  }

  init() {
    return this.stream.init()
      .then(() => this.deleteDataOlderThan(Date.now() - TIME_LIMIT_MS));
  }

  unload() {
    this.stream.unload();
  }

  destroy() {
    return this.stream.destroy();
  }

  deleteDataOlderThan(ts) {
    return this.stream.deleteDataOlderThan(ts);
  }

  info() {
    return this.stream.info();
  }

  handleUrlBarInput({ query, isPrivate }) {
    if (isPrivate) {
      return;
    }

    // TODO: we might want to ignore all prefixes of a query.
    if (!isUrl(query)) {
      this.handleNewQuery({ ts: Date.now(), query, source: 'cliqz' });
    } else {
      logger.debug('Ignore query (isUrl == true)', query);
    }
  }

  handleNewVisit({ url, ts }) {
    const extractedQuery = extractQueryFromUrl(url);
    if (extractedQuery !== null) {
      this.handleNewQuery({
        query: extractedQuery.query,
        source: extractedQuery.source,
        ts,
      });
    }
  }

  handleNewQuery({ query, ts, source }) {
    this.stream.push({
      query,
      ts,
      source,
      tokens: PatternMatching.compactTokens(tokenize(query)),
    });
  }

  all() {
    return this.stream.all();
  }
}
