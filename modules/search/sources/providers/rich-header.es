import { defer } from 'rxjs';
import { retryWhen, map, take, delay } from 'rxjs/operators';
import { fetch as f } from '../../core/http';
import BackendProvider from './backend';
import { getResponse } from '../responses';
import CliqzLanguage from '../../core/language';
import {
  encodeLocale,
  encodePlatform,
  encodeFilter,
  encodeLocation,
  encodeSessionParams,
} from './cliqz-helpers';

export const getRichHeaderQueryString = (q, loc) => [
  `&q=${encodeURIComponent(q)}`,
  encodeSessionParams(),
  CliqzLanguage.queryString(),
  encodeLocale(),
  encodePlatform(),
  encodeFilter(),
  encodeLocation(loc && loc.latitude, loc && loc.longitude)
].join('');

export default class RichHeader extends BackendProvider {
  constructor(settings) {
    super('rich-header');
    this.settings = settings;
  }

  createMessageBody(query, links) {
    return JSON.stringify({
      q: query,
      results: links
        .map(({ extra: snippet, template, url }) => ({
          snippet,
          template,
          url,
        })),
    });
  }

  fetch(query, links) {
    const url = this.settings.RICH_HEADER + getRichHeaderQueryString(query);
    const body = this.createMessageBody(query, links);

    return f(url, { method: 'PUT', body, credentials: 'omit', cache: 'no-store' })
      .then(response => response.json())
      .then(({ results }) => {
        const isIncomplete = results.some(result => result._incomplete);
        if (isIncomplete) {
          return Promise.reject(new Error('incomplete'));
        }
        return results;
      });
  }

  // links is an array of main links from normalized results
  search(query, links, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const { retry } = config.providers[this.id];

    return defer(() => this.fetch(query, links))
      .pipe(
        retryWhen(errors => errors
          .pipe(
            delay(retry.delay),
            take(retry.count)
          )),
        map(results => getResponse({
          provider: this.id,
          config,
          query,
          results: this.mapResults({ results, query }),
          state: 'done',
        })),
        // TODO: do not emit empty result
        this.getOperators()
      );
  }
}
