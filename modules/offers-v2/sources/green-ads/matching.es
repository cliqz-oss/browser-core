import { parse } from '../../core/tlds';
import inject from '../../core/kord/inject';

import EventStore from '../../core/persistence/event-store';

import PatternIndex from './pattern-index';


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

  populateMatches({ after, before }, index = null) {
    if (!this.historyAnalyzer.isEnabled()) {
      return Promise.resolve();
    }

    const patternIndex = index || this.patternIndex;
    return this.historyAnalyzer.action('query', {
      after,
      before,
      queries: patternIndex.tokens,
      urls: patternIndex.tokens,
    }).then(({ queries, urls }) => {
      const promises = [];

      for (let i = 0; i < queries.length; i += 1) {
        promises.push(
          this.handleMatch(this.matchQuery(queries[i], patternIndex))
        );
      }

      for (let i = 0; i < urls.length; i += 1) {
        promises.push(
          this.handleMatch(this.matchUrl(urls[i], patternIndex))
        );
      }

      return Promise.all(promises);
    });
  }

  getNewMatches(ts) {
    return this.stream.latestTs()
      .then(lastUpdated => this.populateMatches({ after: lastUpdated }))
      .then(() => this.stream.query({ after: ts }));
  }

  matchUrl({ url, ts }, index = null) {
    const urlIndex = index || this.patternIndex;
    const lowerCaseUrl = url.toLowerCase();
    const { hostname, domain } = parse(lowerCaseUrl);
    const request = {
      url: lowerCaseUrl,
      cpt: 2,
      hostname,
      hostGD: domain,
    };
    const matches = urlIndex.match(request);
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
    const lowerCaseQuery = query.toLowerCase();
    const request = {
      url: lowerCaseQuery,
      cpt: 2,
      hostname: '',
      hostGD: '',
    };
    const matches = queryIndex.match(request);
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
