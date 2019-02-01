import {
  extractHostname as getHostname,
  getGeneralDomain as getDomain,
} from '../../core/tlds';
import inject from '../../core/kord/inject';
import EventStore from '../../core/persistence/event-store';
import PatternIndex from './pattern-index';
import PatternMatching from '../../platform/lib/adblocker';


function buildIndex(conditions) {
  // Collect all patterns
  const patterns = [];

  conditions.forEach(({ queries, urls }) => {
    queries.forEach((queryPattern) => { patterns.push(queryPattern); });
    urls.forEach((urlPattern) => { patterns.push(urlPattern); });
  });

  return new PatternIndex(patterns);
}


export default class MatchingEngine {
  constructor() {
    // Handle matching of atomic conditions
    this.patternIndex = new PatternIndex();

    // Keep track of query/url patterns for each conditions
    this.conditions = new Set();

    this.historyAnalyzer = inject.module('history-analyzer');

    this.stream = new EventStore('green-ads-matching');
  }

  init() {
    return this.stream.init();
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

  async populateMatches({ after, before }, index = null) {
    if (!this.historyAnalyzer.isEnabled()) {
      return Promise.resolve();
    }

    const patternIndex = index || this.patternIndex;
    const promises = [];
    // eslint-disable-next-line semi
    for await (const match of this.historyAnalyzer.action('query', {
      after,
      before,
      queries: patternIndex.tokens,
      urls: patternIndex.tokens,
    })) {
      if (match.query) {
        promises.push(
          this.handleMatch(this.matchQuery(match, patternIndex))
        );
      } else {
        promises.push(
          this.handleMatch(this.matchUrl(match, patternIndex))
        );
      }
    }

    return Promise.all(promises);
  }

  getNewMatches(ts) {
    return this.stream.latestTs()
      .then(lastUpdated => this.populateMatches({ after: lastUpdated }))
      .then(() => this.stream.query({ after: ts }));
  }

  matchUrl({ url, ts }, index = null) {
    const urlIndex = index || this.patternIndex;
    const matches = urlIndex.match(PatternMatching.makeRequest({
      url,
      type: 2,
    }, { getDomain, getHostname }));
    return matches.map(pattern => ({
      event: 'match',
      type: 'url',
      ts: Date.now(),
      target: {
        url,
        ts
      },
      pattern: {
        filter: pattern.toString(),
        id: pattern.id,
      },
    }));
  }

  matchQuery({ query, source, ts }, index = null) {
    const queryIndex = index || this.patternIndex;
    const matches = queryIndex.match(PatternMatching.makeRequest({
      url: query,
      type: 2,
    }, { getDomain, getHostname }));
    return matches.map(pattern => ({
      event: 'match',
      type: 'query',
      ts: Date.now(),
      target: {
        query,
        source,
        ts
      },
      pattern: {
        filter: pattern.toString(),
        id: pattern.id,
      },
    }));
  }

  handleMatch(events = []) {
    return this.stream.pushMany(events);
  }

  addCondition(condition) {
    const entry = {
      queries: condition.queryPatterns,
      urls: condition.urlPatterns,
    };

    const patternIndex = buildIndex([entry]);

    return this.populateMatches({}, patternIndex).then(() => {
      this.conditions.add(entry);
      this.patternIndex = buildIndex(this.conditions);
    });
  }
}
