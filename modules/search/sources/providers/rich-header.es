import Rx from '../../platform/lib/rxjs';
import { fetch as f } from '../../core/http';
import config from '../../core/config';
import BackendProvider from './backend';
import { getResponse } from '../responses';
import CliqzLanguage from '../../core/language';
import {
  encodeLocale,
  encodePlatform,
  encodeResultOrder,
  encodeCountry,
  encodeFilter,
  encodeLocation,
  encodeSessionParams,
} from './cliqz-helpers';

export const getRichHeaderQueryString = (q, loc) => [
  `&q=${encodeURIComponent(q)}`,
  encodeSessionParams(),
  CliqzLanguage.stateToQueryString(),
  encodeLocale(),
  encodePlatform(),
  encodeResultOrder(),
  encodeCountry(),
  encodeFilter(),
  encodeLocation(true, loc && loc.latitude, loc && loc.longitude)
].join('');

export default class RichHeader extends BackendProvider {
  constructor() {
    super('rich-header');
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
    const url = config.settings.RICH_HEADER + getRichHeaderQueryString(query);
    const body = this.createMessageBody(query, links);

    return f(url, { method: 'PUT', body, credentials: 'omit', cache: 'no-store' })
      .then(response => response.json())
      .then(({ results }) => {
        const isIncomplete = results.some(result => result._incomplete);
        if (isIncomplete) {
          return Promise.reject('incomplete');
        }
        return results;
      });
  }

  // links is an array of main links from normalized results
  search(query, links, _config) {
    if (!query) {
      return this.getEmptySearch(_config);
    }

    const { retry } = _config.providers[this.id];

    return Rx.Observable
      .defer(() => this.fetch(query, links))
      .retryWhen(errors => errors
        .delay(retry.delay)
        .take(retry.count)
      )
      .map(results => getResponse(
        this.id,
        _config,
        query,
        this.mapResults(results, query),
        'done',
      ))
      // TODO: do not emit empty result
      .let(this.getOperators());
  }
}
